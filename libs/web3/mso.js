const web3Connection = require('./index');
let MSOSmartContractAbi = require("./../abi/mso.json");
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

/**
 * This function is used to match the current smart-contract address with setting collection
 * if Contract address does not match it will set from-block to 0 and check all the transaction with initial
 */
 exports.checkFromBlockAndSmartContractAddress = async () => {

    // Get Smart Contract from Setting table
    let mso_smart_contract_address = await Settings.getKey("mso_smart_contract_address");

    // If does not match with config, Set from-block to 0
    if(!utils.matchAddress(mso_smart_contract_address, this.getCurrentSmartContractAddress())){
        Settings.setKey("mso_from_block", 0);
        Settings.setKey("mso_smart_contract_address", this.getCurrentSmartContractAddress());
    }


    // Update ABI of Smart Contract
    let SmartContractAbi = await Settings.getKey("mso_smart_contract_abi");
    if (
        !utils.matchAddress(mso_smart_contract_address, this.getCurrentSmartContractAddress()) ||
        !SmartContractAbi
    ) {
        let SmartContractAbiResponse = await this.getAbiOfSmartContract();
        if (SmartContractAbiResponse.status) {
            SmartContractAbi = JSON.parse(SmartContractAbiResponse.data);
            await Settings.setKey("mso_smart_contract_abi", SmartContractAbi);
        }
    }

    /**
     * TODO : Check JSON Schema Of SmartContractAbi for ABI Format
     */
    MSOSmartContractAbi = SmartContractAbi ? SmartContractAbi : MSOSmartContractAbi;

}

exports.getAbiOfSmartContract = async () => {
    let chainId = config.is_mainnet ? config.SupportedChainId.MAINNET : config.SupportedChainId.RINKEBY;
    let SmartContractAbi = await web3Connection.getAbiOfSmartContract(this.getCurrentSmartContractAddress(), chainId);
    return SmartContractAbi;
}

exports.getCurrentSmartContractAddress = () => {
    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.mso[config.SupportedChainId.MAINNET] : contracts.mso[config.SupportedChainId.RINKEBY];
    return SmartContractAddress;
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
                if(
                    !process.env.DEBUG_MSO_TRANSACTION_HASH ||
                    process.env.DEBUG_MSO_TRANSACTION_HASH == event.transactionHash
                ){
                    await this.msoAddToSyncTransaction(event.transactionHash, event.blockNumber);
                }
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
        let BuyMSOEventDetails = web3Connection.decodeEventParametersLogs(web3Connect, BuyMSOEventAbi, hasBuyMSOEvent);

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
                // Get Wallet Address from BuyMSO details
                let wallet_address = _.get(BuyMSOEventDetails, "_buyer", null);
                let currency_address =  _.get(BuyMSOEventDetails, "_currency", null);
                let crypto_amount =   _.get(BuyMSOEventDetails, "_amount", null);

                if(wallet_address == null){
                    /**
                     * TODO: Send Error Report
                     * Message : "MSO Transaction buyer address is not valid",
                     * config.is_mainnet, this.getCurrentSmartContractAddress(), transaction_hash
                     */
                }

                // Get Currency and Amount Detail from BuyMSO details
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
                if(!(process.env.UPDATE_MSO_FROM_BLOCK_OFF && process.env.UPDATE_MSO_FROM_BLOCK_OFF == "1")) await Settings.setKey("mso_from_block", promise.mso_from_block)
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