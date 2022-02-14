const web3Connection = require('./index');
let P4LSmartContractAbi = require("./../abi/p4l.json");
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
const P4LToken = mongoose.model('P4LToken');
const axios = require("axios");

/**
 * This function is used to match the current smart-contract address with setting collection
 * if Contract address does not match it will set from-block to 0 and check all the transaction with initial
 */
exports.checkFromBlockAndSmartContractAddress = async () => {

    // Get Smart Contract from Setting table
    let p4l_smart_contract_address = await Settings.getKey("p4l_smart_contract_address");

    // If does not match with config, Set from-block to 0
    if (!utils.matchAddress(p4l_smart_contract_address, this.getCurrentSmartContractAddress())) {
        Settings.setKey("p4l_from_block", 0);
        Settings.setKey("p4l_smart_contract_address", this.getCurrentSmartContractAddress());
    }

    // Update ABI of Smart Contract
    let SmartContractAbi = await Settings.getKey("p4l_smart_contract_abi");
    if (
        !utils.matchAddress(p4l_smart_contract_address, this.getCurrentSmartContractAddress()) ||
        !SmartContractAbi
    ) {
        let SmartContractAbiResponse = await this.getAbiOfSmartContract();
        if (SmartContractAbiResponse.status) {
            SmartContractAbi = JSON.parse(SmartContractAbiResponse.data);
            await Settings.setKey("p4l_smart_contract_abi", SmartContractAbi);
        }
    }

    /**
     * TODO : Check JSON Schema Of SmartContractAbi for ABI Format
     */
    P4LSmartContractAbi = SmartContractAbi ? SmartContractAbi : P4LSmartContractAbi;

}

exports.getAbiOfSmartContract = async () => {
    let chainId = config.is_mainnet ? config.SupportedChainId.MAINNET : config.SupportedChainId.RINKEBY;
    let SmartContractAbi = await web3Connection.getAbiOfSmartContract(this.getCurrentSmartContractAddress(), chainId);
    return SmartContractAbi;
}

exports.getWeb3Connect = async (check_is_connected = false) => {
    return await web3Connection.getWeb3Connect("p4l", check_is_connected);
}

let P4LStartContract;
let P4LEventSubscription;

exports.getCurrentSmartContractAddress = () => {
    let SmartContractAddress;
    SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];
    return SmartContractAddress;
}

exports.connectSmartContract = async () => {
    const web3Connect = await this.getWeb3Connect();

    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];

    try {
        try {
            if (P4LStartContract) {
                let productId = await P4LStartContract.methods.productIds().call()
                if (productId >= 0) {
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
                if(!(process.env.UPDATE_P4L_FROM_BLOCK_OFF && process.env.UPDATE_P4L_FROM_BLOCK_OFF == "1")) await Settings.setKey("p4l_from_block", promise.p4l_from_block)
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
        let web3Connect = await this.getWeb3Connect();
        // console.log("web3Connect", web3Connect);
        // let details = web3Connect.utils.hexToUtf8("0x68d336549dec75ffb2643695c6785482b1afb2708ba96a01f266a362a4c11cc3");

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
        !policy.payment_id || !payment || !payment.network || !policy.DeviceInsurance.contract_product_id
    ) {
        let web3Connect = await this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);
        // console.log("Transaction Details ", TransactionDetails);
        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);

        // BuyProduct & BuyP4L Event Log
        let BuyProductEventAbi = P4LSmartContractAbi.find(value => value.name == "BuyProduct" && value.type == "event");
        let hasBuyProductEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyProductEventAbi);

        let BuyP4LEventAbi = P4LSmartContractAbi.find(value => value.name == "BuyP4L" && value.type == "event");
        let hasBuyP4LEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyP4LEventAbi);
        let BuyP4LEventDetails = web3Connection.decodeEventParametersLogs(web3Connect, BuyP4LEventAbi, hasBuyP4LEvent);

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
            if (policy && policy.txn_hash != product.policyId) {
                /**
                 * TODO: Send Error Report : policy found but policy id not match with product
                 * data : product_type : p4l, smart_contract_address, product, policy
                 */
            }
            if (!policy) {
                policy = await Policies.findOne({ txn_hash: product.policyId });
                payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;
            }
            if (
                policy &&
                (
                    policy.payment_status != constant.PolicyPaymentStatus.paid ||
                    !policy.payment_id || !payment || !payment.network ||
                    !policy.DeviceInsurance.contract_product_id || !policy.payment_hash
                )
            ) {

                // Get Wallet Address from BuyP4L details
                let wallet_address = _.get(BuyP4LEventDetails, "_buyer", null);
                let currency_address =  _.get(BuyP4LEventDetails, "_currency", null);
                let crypto_amount =   _.get(BuyP4LEventDetails, "_amount", null);

                if(wallet_address == null){
                    /**
                     * TODO: Send Error Report
                     * Message : "P4L Transaction buyer address is not valid",
                     * config.is_mainnet, this.getCurrentSmartContractAddress(), transaction_hash
                     */
                }
                
                // Get Currency and Amount Detail from BuyP4L details
                let crypto_currency;
                if(TransactionDetails.value > 0){
                    crypto_currency = "Ether";
                    crypto_amount = web3Connection.covertToDisplayValue(web3Connect, TransactionDetails.value, "eth");
                }else if(utils.findAddressInList(config.cvr_token_addresses, currency_address)){
                    crypto_currency = "CVR";
                    crypto_amount = web3Connection.covertToDisplayValue(web3Connect, crypto_amount, "cvr");
                }else if(utils.findAddressInList(config.dai_token_addresses, currency_address)){
                    crypto_currency = "DAI";
                    crypto_amount = web3Connection.covertToDisplayValue(web3Connect, crypto_amount, "dai");
                }

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
                policy.total_amount = web3Connection.removeDecimalFromUSDPrice(product.priceInUSD);
                policy.currency = "USD";
                policy.crypto_currency = crypto_currency;
                policy.crypto_amount = crypto_amount;

                await policy.save();

                payment = payment ? payment : new Payments;

                let chain = web3Connect.utils.toDecimal(TransactionDetails.chainId)

                payment.payment_status = constant.PolicyPaymentStatus.paid;
                payment.blockchain = "Ethereum";
                payment.wallet_address = wallet_address;
                payment.block_timestamp = product.startTime;
                payment.txn_type = "onchain";
                payment.payment_hash = transaction_hash;
                payment.currency = "USD";
                payment.paid_amount = policy.total_amount;
                payment.network = chain;
                payment.crypto_currency = crypto_currency;
                payment.crypto_amount = crypto_amount;

                await payment.save();

                policy.payment_id = payment._id;
                await policy.save();
                await Settings.setKey("p4l_last_sync_transaction", transaction_hash)

                await policy.callP4LCreatePolicyRequest();

            }

        }
    }
    return true;
}

exports.createPolicy = async (req) => {
    let req_config = {
        method: "post",
        url: `${config.p4l_api_baseurl}create-policy-api/`,
        headers: {
            Authorization: await P4LToken.getToken(),
            "Content-Type": "application/json",
        },
        data: req,
    };

    let response = {};
    let result = {};
    try {
        response = await axios(req_config);
        if (_.get(response.data, "status", false) == "OK") {
            result = { status: true, response };
        } else {
            result = { status: false, response }
        }
    } catch (error) {
        result = { status: false, error }
    }
    return result;
};

exports.p4lSyncTransactionForApi = async (transaction_hash) => {
    // Confirm web3Connection is connected
    await this.getWeb3Connect(true);
    try {
        await this.connectSmartContract();
        await this.p4lSyncTransaction(transaction_hash);
    } catch (error) {
        /**
         * TODO: Send Error Report : Issue on p4l Sync Transaction for api
         * code: sync_transaction_for_api
         * transaction_hash, "p4l", config.is_mainnet
         */
    }
}