const web3Connection = require('./index');
const P4LSmartContractAbi = require("./../abi/p4l.json");
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


exports.getWeb3Connect = () => {
    return web3Connection.getWeb3Connect("p4l");
}

let P4LStartContract;
let P4LEventSubscription;

exports.connectSmartContract = async () => {
    const web3Connect = this.getWeb3Connect();

    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];

    try {
        try {
            if (P4LStartContract) {
                let productId = P4LStartContract.methods.productIds().call()
                if (productId) {
                    return P4LStartContract;
                }
            }
        } catch (error) {
        }
        P4LStartContract = new web3Connect.eth.Contract(P4LSmartContractAbi, SmartContractAddress);
        return P4LStartContract;
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}

let P4LTransactionPromises = [];
let IsP4LTransactionRunning = false;

exports.p4lAddToSyncTransaction = async (transaction_hash, p4l_from_block) => {
    P4LTransactionPromises.push({ transaction_hash, p4l_from_block });
    if (IsP4LTransactionRunning == false) {
        console.log("P4L  ::  Started.");
        while (P4LTransactionPromises.length > 0) {
            IsP4LTransactionRunning = true;
            let promise = P4LTransactionPromises[0];
            await this.p4lSyncTransaction(promise.transaction_hash);
            console.log("P4L  ::  Completed ", promise.transaction_hash);
            if (promise.p4l_from_block) {
                await Settings.setKey("p4l_from_block", promise.p4l_from_block)
            }
            P4LTransactionPromises.splice(0, 1);
            console.log("P4L  ::  Rest ", P4LTransactionPromises.length);
            if (P4LTransactionPromises.length == 0) {
                IsP4LTransactionRunning = false;
            }
        }
        console.log("P4L  ::  Completed.");
    } else {
        console.log("P4L  ::  Already running.....");
    }
}

exports.p4lPolicySync = async () => {

    let P4LFromBlock = await Settings.getKey("p4l_from_block");
    P4LFromBlock = P4LFromBlock ? P4LFromBlock : 0;

    try {
        let web3Connect = this.getWeb3Connect();

        await this.connectSmartContract();

        P4LEventSubscription = await P4LStartContract.events.allEvents({ fromBlock: P4LFromBlock })

        /**
         * BuyP4L, BuyProduct 
         * These event execute from P4L SmartContract 
         * Only when any user purchase successfully p4l product
         * This function will match event data with current database,
         * If there any new product found it will insert data to database
         */
        P4LEventSubscription.on('data', async (event) => {
            if (["BuyP4L", "BuyProduct"].includes(event.event)) {
                // Find Policy
                await this.p4lAddToSyncTransaction(event.transactionHash, event.blockNumber);
            }
        })

        // P4LEventSubscription.on('changed', changed => console.log("CHANGED ", changed))
        // P4LEventSubscription.on('connected', str => console.log("CONNECTED ", str))
        P4LEventSubscription.on('error', str => {
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
        return await P4LStartContract.methods.products(product_id).call()
    } catch (error) {
        /**
         * TODO: Send Error report : issue while getting product detail from smart contract
         * data : mainnet or testnet, product_id, error
         */
    }
    return false;
}

exports.p4lSyncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;

    if (
        !policy ||
        policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment || !policy.DeviceInsurance.contract_product_id
    ) {
        let web3Connect = this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);
        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);

        // BuyProduct & BuyP4L Event Log
        let BuyProductEventAbi = P4LSmartContractAbi.find(value => value.name == "BuyProduct" && value.type == "event");
        let hasBuyProductEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyProductEventAbi);

        let BuyP4LEventAbi = P4LSmartContractAbi.find(value => value.name == "BuyP4L" && value.type == "event");
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