const web3Connection = require('./index');
let InsurAceSmartContractAbi = require("./../abi/insurace.json");
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
const Users = mongoose.model('Users');


exports.getWeb3Connect = async (check_is_connected = false) => {
    return await web3Connection.getWeb3Connect("insurace", check_is_connected);
}

/**
 * This function is used to match the current smart-contract address with setting collection
 * if Contract address does not match it will set from-block to 0 and check all the transaction with initial
 */
 exports.checkFromBlockAndSmartContractAddress = async () => {

    // Get Smart Contract from Setting table
    let insurace_smart_contract_address = await Settings.getKey("insurace_smart_contract_address");

    // If does not match with config, Set from-block to 0
    if(!utils.matchAddress(insurace_smart_contract_address, this.getCurrentSmartContractAddress())){
        Settings.setKey("insurace_from_block", 0);
        Settings.setKey("insurace_smart_contract_address", this.getCurrentSmartContractAddress());
    }

    // Update ABI of Smart Contract
    let SmartContractAbi = await Settings.getKey("insurace_smart_contract_abi");
    if (
        !utils.matchAddress(insurace_smart_contract_address, this.getCurrentSmartContractAddress()) ||
        !SmartContractAbi
    ) {
        let SmartContractAbiResponse = await this.getAbiOfSmartContract();
        if (SmartContractAbiResponse.status) {
            SmartContractAbi = JSON.parse(SmartContractAbiResponse.data);
            await Settings.setKey("insurace_smart_contract_abi", SmartContractAbi);
        }
    }

    /**
     * TODO : Check JSON Schema Of SmartContractAbi for ABI Format
     */
    InsurAceSmartContractAbi = SmartContractAbi ? SmartContractAbi : InsurAceSmartContractAbi;

}

exports.getAbiOfSmartContract = async () => {
    let chainId = config.is_mainnet ? config.SupportedChainId.MAINNET : config.SupportedChainId.RINKEBY;
    let SmartContractAbi = await web3Connection.getAbiOfSmartContract(this.getCurrentSmartContractAddress(), chainId);
    return SmartContractAbi;
}

exports.getCurrentSmartContractAddress = () => {
    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.insureAce[config.SupportedChainId.MAINNET] : contracts.insureAce[config.SupportedChainId.RINKEBY];
    return SmartContractAddress;
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
                let productId = await InsurAceStartContract.methods.productIds().call()
                if (productId >= 0) {
                    return InsurAceStartContract;
                }
            }
        } catch (error) {
            /**
             * TODO: Send Error Report: issue on connect smart contract
             * data : smart_contract, config.is_mainnet, 
             */
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
        console.log("INSURACE  ::  Started.");
        while (TransactionPromises.length > 0) {
            IsTransactionRunning = true;
            let promise = TransactionPromises[0];
            // if (TransactionPromises.length == 1) {
                console.log(`INSURACE  ::  Last Transaction Waiting..... ${promise.transaction_hash}`);
                await (new Promise(resolve => setTimeout(resolve, config.sync_time_web3_smart_contract))) // 1 min
            // }
            await this.syncTransaction(promise.transaction_hash);
            console.log("INSURACE  ::  Completed ", promise.transaction_hash);
            if (promise.insurace_from_block) {
                await Settings.setKey("insurace_from_block", promise.insurace_from_block)
            }
            TransactionPromises.splice(0, 1);
            console.log("INSURACE  ::  Rest ", TransactionPromises.length);
            if (TransactionPromises.length == 0) {
                IsTransactionRunning = false;
            }
        }
        console.log("INSURACE  ::  Completed.");
    } else {
        console.log("INSURACE  ::  Already running.....");
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
         * BuyInsureAce
         * These event execute from InsurAce SmartContract 
         * Only when any user purchase successfully InsureAce product
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
             * TODO: Send Error Report "InsureAce Start Contract issue on fetch all events."
             */
        })

    } catch (error) {
        console.log("Err", error);
        /**
         * TODO: Send Error Report "InsureAceContract is not connected"
         */
    }
}

exports.getTransaction = async (transaction_hash) => {
    return await web3Connection.getTransaction("insurace", transaction_hash);
}

exports.getTransactionReceipt = async (transaction_hash) => {
    return await web3Connection.getTransactionReceipt("insurace", transaction_hash);
}

exports.syncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;

    if (
        !policy ||
        policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment || 
        (policy.product_type == constant.ProductTypes.smart_contract && !policy.SmartContract.block) ||
        (policy.product_type == constant.ProductTypes.crypto_exchange && !policy.CryptoExchange.block)
    ) {
        let web3Connect = await this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);
        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);

        // BuyInsureAce Event Log
        let BuyInsureAceEventAbi = InsurAceSmartContractAbi.find(value => value.name == "BuyInsureAce" && value.type == "event");
        let hasBuyInsureAceEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyInsureAceEventAbi);

        if (hasBuyInsureAceEvent) {

            let details = web3Connection.decodeEventParametersLogs(web3Connect, BuyInsureAceEventAbi, hasBuyInsureAceEvent);

            let product_id = _.get(details, "productIds.0", "");

            let cover_details = await Settings.getKey("cover_details");
            cover_details = Array.isArray(cover_details) ? cover_details : [];
            let crypto_currency = utils.checkIsCVRToken(_.get(details, "_token", "")) ? "CVR" : "ETH";
            
            let wallet_address = details._buyer;

            if (!policy) {

                let cover = cover_details.find(value => {
                    return value && _.get(value, "product_id", false) == product_id && _.get(value, "company_code", false) == "insurace"
                })

                let type = cover && constant.CryptoExchangeTypes.includes(cover.type) ? constant.ProductTypes.crypto_exchange : constant.ProductTypes.smart_contract;
                // let wallet_address = details._buyer;
                policy = new Policies;
                policy.user_id = await Users.getUser(wallet_address);    
                policy.product_type = type;
                policy.wallet_address = wallet_address;
                policy.payment_hash = transaction_hash;

                if(!cover){
                    /**
                     * TODO: Send Error Report(critical)
                     * Message : Cover does not exist in list
                     * transaction_hash, "RINKEBY"
                     */
                }
                
                
                if(policy.product_type == constant.ProductTypes.crypto_exchange){
                    policy.CryptoExchange = {
                        company_code: "insurace",
                        product_id: product_id,
                        unique_id: _.get(cover, "unique_id", null),
                        address: _.get(cover, "address", null),
                        name: _.get(cover, "name", null),
                        type: _.get(cover, "type", null),
                        duration_days: null,
                        chain: "ethereum",
                        crypto_currency: crypto_currency,
                        crypto_amount: null
                    }
                }else{
                    policy.SmartContract = {
                        company_code: "insurace",
                        product_id: product_id,
                        unique_id: _.get(cover, "unique_id", null),
                        address: _.get(cover, "address", null),
                        name: _.get(cover, "name", null),
                        type: _.get(cover, "type", null),
                        duration_days: null,
                        chain: "ethereum",
                        crypto_currency: crypto_currency,
                        crypto_amount: null
                    }
                }
                await policy.save()
            }
            if (
                policy &&
                (
                    policy.payment_status != constant.PolicyPaymentStatus.paid ||
                    !policy.payment_id || !payment || 
                    (policy.product_type == constant.ProductTypes.smart_contract && !policy.SmartContract.block) ||
                    (policy.product_type == constant.ProductTypes.crypto_exchange && !policy.CryptoExchange.block)
                )
            ) {
                let chain = web3Connect.utils.toDecimal(TransactionDetails.chainId)

                if(policy.product_type == constant.ProductTypes.crypto_exchange){
                    policy.CryptoExchange.block = TransactionDetails.blockNumber;
                    policy.CryptoExchange.network = chain;
                }else{
                    policy.SmartContract.block = TransactionDetails.blockNumber;
                    policy.SmartContract.network = chain;
                }

                policy.status = constant.PolicyStatus.active;
                policy.StatusHistory.push({
                    status: policy.status,
                    updated_at: new Date(moment()),
                    updated_by: policy.user_id
                });
                policy.payment_status = constant.PolicyPaymentStatus.paid;
                policy.payment_hash = transaction_hash;
                // policy.total_amount = product.priceInUSD / (10 ** 18);

                await policy.save();

                payment = payment ? payment : new Payments;

                let blog_details = await web3Connect.eth.getBlock(TransactionDetails.blockNumber);

                payment.payment_status = constant.PolicyPaymentStatus.paid;
                payment.blockchain = "Ethereum";
                payment.wallet_address = wallet_address;
                payment.block_timestamp = _.get(blog_details, "timestamp", null);
                payment.txn_type = "onchain";
                payment.payment_hash = transaction_hash;
                payment.currency = crypto_currency;
                // payment.paid_amount = policy.total_amount;
                payment.network = chain;
                payment.crypto_currency = crypto_currency;
                // payment.crypto_amount = TransactionDetails.value;
                await payment.save();

                policy.payment_id = payment._id;
                await policy.save();
            }

        }
    }
    return true;
}

// exports.p4lSyncTransactionForApi = async (transaction_hash) => {
//     // Confirm web3Connection is connected
//     await this.getWeb3Connect(true);
//     try {
//         await this.connectSmartContract();
//         await this.syncTransaction(transaction_hash);
//     } catch (error) {
//         /**
//          * TODO: Send Error Report : Issue on p4l Sync Transaction for api
//          * code: sync_transaction_for_api
//          * transaction_hash, "p4l", config.is_mainnet
//          */
//     }
// }