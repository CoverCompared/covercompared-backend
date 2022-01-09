const web3Connection = require('./index');
const MSOSmartContractAbi = require("./../abi/mso.json");
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
    return await web3Connection.getWeb3Connect("mso", check_is_connected);
}

let MSOStartContract;
let MSOEventSubscription;

exports.connectSmartContract = async () => {
    const web3Connect = await this.getWeb3Connect();

    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.mso[config.SupportedChainId.MAINNET] : contracts.mso[config.SupportedChainId.RINKEBY];

    try {
        if (MSOStartContract) {
            let productId = await MSOStartContract.methods.productIds().call()
            if (productId >= 0) {
                return MSOStartContract;
            }
        }
        MSOStartContract = new web3Connect.eth.Contract(MSOSmartContractAbi, SmartContractAddress);
        return MSOStartContract;
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}

exports.msoPolicySync = async () => {


    let MSOFromBlock = await Settings.getKey("mso_from_block");
    MSOFromBlock = MSOFromBlock ? MSOFromBlock : 0;

    try {
        let web3Connect = await this.getWeb3Connect("mso");

        await this.connectSmartContract("mso");

        MSOEventSubscription = await MSOStartContract.events.allEvents({ fromBlock: MSOFromBlock })

        /**
         * BuyMSO, BuyProduct 
         * These event execute from MSO SmartContract 
         * Only when any user purchase successfully mso product
         * This function will match event data with current database,
         * If there any new product found it will insert data to database
         */
        MSOEventSubscription.on('data', async (event) => {
            if (["BuyMSO", "BuyProduct"].includes(event.event)) {
                // Find Policy
                await this.msoAddToSyncTransaction(event.transactionHash, event.blockNumber);
            }
        })

        // MSOEventSubscription.on('changed', changed => console.log("CHANGED ", changed))
        // MSOEventSubscription.on('connected', str => console.log("CONNECTED ", str))
        MSOEventSubscription.on('error', str => {
            /**
             * TODO: Send Error Report "MSO Start Contract issue on fetch all events."
             */
        })

    } catch (error) {
        console.log("Err", error);
        /**
         * TODO: Send Error Report "MSOContract is not connected"
         */
    }
}

exports.getTransaction = async (transaction_hash) => {
    return await web3Connection.getTransaction("mso", transaction_hash);
}

exports.getTransactionReceipt = async (transaction_hash) => {
    return await web3Connection.getTransactionReceipt("mso", transaction_hash);
}

exports.msoGetProductDetails = async (product_id) => {
    await this.connectSmartContract();
    try {
        return await MSOStartContract.methods.products(product_id).call()
    } catch (error) {
        /**
         * TODO: Send Error report : issue while getting product detail from smart contract
         * data : mainnet or testnet, product_id, error
         */
    }
    return false;
}

exports.msoSyncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;


    if (
        !policy ||
        policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment || !payment.network || !policy.MSOPolicy.contract_product_id
    ) {
        let web3Connect = await this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);
        // console.log('Transaction Details ', TransactionDetails);
        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);

        // BuyProduct & BuyMSO Event Log
        let BuyProductEventAbi = MSOSmartContractAbi.find(value => value.name == "BuyProduct" && value.type == "event");
        let hasBuyProductEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyProductEventAbi);

        let BuyMSOEventAbi = MSOSmartContractAbi.find(value => value.name == "BuyMSO" && value.type == "event");
        let hasBuyMSOEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyMSOEventAbi);

        if (hasBuyProductEvent || hasBuyMSOEvent) {
            // Get ProductId from Transaction
            let productId;
            if (hasBuyProductEvent) {
                productId = web3Connect.utils.toDecimal(hasBuyProductEvent.topics[1])
            } else if (hasBuyMSOEvent) {
                productId = web3Connect.utils.toDecimal(hasBuyMSOEvent.topics[1])
            }
            console.log("MSO  ::  Started ProductID : ", productId);


            // // Get Product Detail from ProductId
            let product = await this.msoGetProductDetails(productId);
            if(policy && policy.txn_hash != product.policyId){
                /**
                 * TODO: Send Error Report : policy found but policy id not match with product
                 * data : product_type : mso, smart_contract_address, product, policy
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
                    !policy.payment_id || !payment || !payment.network || !policy.MSOPolicy.contract_product_id ||
                    !policy.payment_hash
                )
            ){
                policy.MSOPolicy.contract_product_id = productId;
                policy.MSOPolicy.start_time = productId;
                policy.MSOPolicy.plan_details.period = product.period;
                policy.MSOPolicy.mso_addon_service = product.conciergePrice / (10 ** 18);
                policy.status = constant.PolicyStatus.active;
                policy.StatusHistory.push({
                    status: policy.status,
                    updated_at: new Date(moment()),
                    updated_by: policy.user_id
                });
                policy.payment_status = constant.PolicyPaymentStatus.paid;
                policy.payment_hash = transaction_hash;
                policy.total_amount = (product.priceInUSD / (10 ** 18)) + policy.MSOPolicy.mso_addon_service;

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

let MSOTransactionPromises = [];
let IsMSOTransactionRunning = false;

exports.msoAddToSyncTransaction = async (transaction_hash, mso_from_block) => {
    MSOTransactionPromises.push({ transaction_hash, mso_from_block });
    if (IsMSOTransactionRunning == false) {
        console.log("MSO  ::  Started.");
        while (MSOTransactionPromises.length > 0) {
            IsMSOTransactionRunning = true;
            let promise = MSOTransactionPromises[0];
            await this.msoSyncTransaction(promise.transaction_hash);
            console.log("MSO  ::  Completed ", promise.transaction_hash);
            if (promise.mso_from_block) {
                await Settings.setKey("mso_from_block", promise.mso_from_block)
            }
            MSOTransactionPromises.splice(0, 1);
            console.log("MSO  ::  Rest ", MSOTransactionPromises.length);
            if (MSOTransactionPromises.length == 0) {
                IsMSOTransactionRunning = false;
            }
        }
        console.log("MSO  ::  Completed.");
    } else {
        console.log("MSO  ::  Already running.....");
    }
}

exports.msoSyncTransactionForApi = async (transaction_hash) => {
    // Confirm web3Connection is connected
    await this.getWeb3Connect(true);
    await this.connectSmartContract();
    await this.msoSyncTransaction(transaction_hash);   
}