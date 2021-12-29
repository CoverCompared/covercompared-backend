const web3Connection = require('./index');
const InsurAceSmartContractAbi = require("./../abi/insurace.json");
const _ = require('lodash');
const mongoose = require('mongoose');
const moment = require('moment');
const config = require('../../config');
const contracts = require('../contracts');
const utils = require('../utils');
const constant = require('../constants');
const Settings = mongoose.model('Settings');
const Policies = mongoose.model('Policies');
const Payments = mongoose.model('Payments');


exports.getWeb3Connect = async (check_is_connected = false) => {
    return await web3Connection.getWeb3Connect("insurace", check_is_connected);
}

let InsurAceStartContract;
let InsurAceEventSubscription;

exports.connectSmartContract = async () => {
    const web3Connect = await this.getWeb3Connect();

    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.insureAce[config.SupportedChainId.MAINNET] : contracts.insureAce[config.SupportedChainId.RINKEBY];

    try {
        try {
            if (InsurAceStartContract) {
                let productId = InsurAceStartContract.methods.productIds().call()
                if (productId) {
                    return InsurAceStartContract;
                }
            }
        } catch (error) {
        }
        InsurAceStartContract = new web3Connect.eth.Contract(InsurAceSmartContractAbi, SmartContractAddress);
        return InsurAceStartContract;
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}

let TransactionPromises = [];
let IsTransactionRunning = false;

exports.addToSyncTransaction = async (transaction_hash, insurace_from_block) => {
    TransactionPromises.push({ transaction_hash, insurace_from_block });
    if (IsTransactionRunning == false) {
        console.log("P4L  ::  Started.");
        while (TransactionPromises.length > 0) {
            IsTransactionRunning = true;
            let promise = TransactionPromises[0];
            await this.syncTransaction(promise.transaction_hash);
            console.log("P4L  ::  Completed ", promise.transaction_hash);
            if (promise.insurace_from_block) {
                await Settings.setKey("insurace_from_block", promise.insurace_from_block)
            }
            TransactionPromises.splice(0, 1);
            console.log("P4L  ::  Rest ", TransactionPromises.length);
            if (TransactionPromises.length == 0) {
                IsTransactionRunning = false;
            }
        }
        console.log("P4L  ::  Completed.");
    } else {
        console.log("P4L  ::  Already running.....");
    }
}

exports.policySync = async () => {

    let FromBlock = await Settings.getKey("insurace_from_block");
    FromBlock = FromBlock ? FromBlock : 0;

    try {
        let web3Connect = await this.getWeb3Connect();

        await this.connectSmartContract();

        InsurAceEventSubscription = await InsurAceStartContract.events.allEvents({ fromBlock: FromBlock })

        /**
         * BuyP4L, BuyProduct 
         * These event execute from P4L SmartContract 
         * Only when any user purchase successfully p4l product
         * This function will match event data with current database,
         * If there any new product found it will insert data to database
         */
        InsurAceEventSubscription.on('data', async (event) => {
            if (["BuyInsureAce"].includes(event.event)) {
                // Find Policy
                await this.addToSyncTransaction(event.transactionHash, event.blockNumber);
            }
        })

        // InsurAceEventSubscription.on('changed', changed => console.log("CHANGED ", changed))
        // InsurAceEventSubscription.on('connected', str => console.log("CONNECTED ", str))
        InsurAceEventSubscription.on('error', str => {
            /**
             * TODO: Send Error Report "P4L Start Contract issue on fetch all events."
             */
        })

    } catch (error) {
        console.log("Err", error);
        /**
         * TODO: Send Error Report "P4LContract is not connected"
         */
    }
}

exports.getTransaction = async (transaction_hash) => {
    return await web3Connection.getTransaction("p4l", transaction_hash);
}

exports.getTransactionReceipt = async (transaction_hash) => {
    return await web3Connection.getTransactionReceipt("p4l", transaction_hash);
}

exports.p4lGetProductDetails = async (product_id) => {
    await this.connectSmartContract();
    try {
        return await InsurAceStartContract.methods.products(product_id).call()
    } catch (error) {
        /**
         * TODO: Send Error report : issue while getting product detail from smart contract
         * data : mainnet or testnet, product_id, error
         */
    }
    return false;
}

exports.syncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;

    if (
        !policy ||
        policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment || !policy.DeviceInsurance.contract_product_id
    ) {
        let web3Connect = await this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);
        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);

        // BuyProduct & BuyP4L Event Log
        let BuyProductEventAbi = InsurAceSmartContractAbi.find(value => value.name == "BuyProduct" && value.type == "event");
        let hasBuyProductEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyProductEventAbi);

        let BuyP4LEventAbi = InsurAceSmartContractAbi.find(value => value.name == "BuyP4L" && value.type == "event");
        let hasBuyP4LEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyP4LEventAbi);

        if (hasBuyProductEvent || hasBuyP4LEvent) {
            // Get ProductId from Transaction
            let productId;
            if (hasBuyProductEvent) {
                productId = web3Connect.utils.toDecimal(hasBuyProductEvent.topics[1])
            } else if (hasBuyP4LEvent) {
                productId = web3Connect.utils.toDecimal(hasBuyP4LEvent.topics[1])
            }
            console.log("P4L  ::  Started ProductID : ", productId);

            // Get Product Detail from ProductId
            let product = await this.p4lGetProductDetails(productId);
            if(policy && policy.txn_hash != product.policyId){
                /**
                 * TODO: Send Error Report : policy found but policy id not match with product
                 * data : product_type : p4l, smart_contract_address, product, policy
                 */
            }

            if(!policy){
                policy = await Policies.findOne({ txn_hash: product.policyId });
                payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;
            }
            if(
                policy &&
                (
                    policy.payment_status != constant.PolicyPaymentStatus.paid ||
                    !policy.payment_id || !payment || !policy.DeviceInsurance.contract_product_id ||
                    !policy.payment_hash
                )
            ){
                policy.DeviceInsurance.contract_product_id = productId;
                policy.DeviceInsurance.start_time = productId;
                policy.DeviceInsurance.durPlan = product.durPlan;
                policy.DeviceInsurance.purchase_month = _.get(constant.p4lPurchaseMonth, product.durPlan, product.durPlan);
                policy.status = constant.PolicyStatus.active;
                policy.StatusHistory.push({
                    status: policy.status,
                    updated_at: new Date(moment()),
                    updated_by: policy.user_id
                });
                policy.payment_status = constant.PolicyPaymentStatus.paid;
                policy.payment_hash = transaction_hash;
                policy.total_amount = product.priceInUSD / (10 ** 18);

                await policy.save();

                payment = payment ? payment : new Payments;

                let chain = web3Connect.utils.toDecimal(TransactionDetails.chainId)

                payment.payment_status = constant.PolicyPaymentStatus.paid;
                payment.blockchain = "Ethereum";
                payment.wallet_address = TransactionDetails.from;
                payment.block_timestamp = product.startTime;
                payment.txn_type = "onchain";
                payment.payment_hash = transaction_hash;
                payment.currency = "USD";
                payment.paid_amount = policy.total_amount;
                payment.network = chain;
                payment.crypto_currency = "Ether";
                payment.crypto_amount = TransactionDetails.value;
                await payment.save();

                policy.payment_id = payment._id;
                await policy.save();
            }

        }
    }
    return true;
}

exports.p4lSyncTransactionForApi = async (transaction_hash) => {
    // Confirm web3Connection is connected
    await this.getWeb3Connect(true);
    try {
        await this.connectSmartContract();
        await this.syncTransaction(transaction_hash);   
    } catch (error) {
        /**
         * TODO: Send Error Report : Issue on p4l Sync Transaction for api
         * code: sync_transaction_for_api
         * transaction_hash, "p4l", config.is_mainnet
         */
    }
}