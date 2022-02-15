const web3Connection = require('./index');
let NexusSmartContractAbi = require("./../abi/nexus.json");
let TransferAbi = require("./../abi/transfer.json");
let CoverBoughtAbi = require("./../abi/nexus-cover-bought-event.json");
const NexusQuotationDataSmartContractAbi = require("./../abi/nexus-quotation-data.json");
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
    return await web3Connection.getWeb3Connect("nexus", check_is_connected);
}

/**
 * This function is used to match the current smart-contract address with setting collection
 * if Contract address does not match it will set from-block to 0 and check all the transaction with initial
 */
exports.checkFromBlockAndSmartContractAddress = async () => {

    // Get Smart Contract from Setting table
    let nexus_smart_contract_address = await Settings.getKey("nexus_smart_contract_address");

    // If does not match with config, Set from-block to 0
    if (!utils.matchAddress(nexus_smart_contract_address, this.getCurrentSmartContractAddress())) {
        Settings.setKey("nexus_from_block", 0);
        Settings.setKey("nexus_smart_contract_address", this.getCurrentSmartContractAddress());
    }


    // Update ABI of Smart Contract
    let SmartContractAbi = await Settings.getKey("nexus_smart_contract_abi");
    if (
        !utils.matchAddress(nexus_smart_contract_address, this.getCurrentSmartContractAddress()) ||
        !SmartContractAbi
    ) {
        let SmartContractAbiResponse = await this.getAbiOfSmartContract();
        if (SmartContractAbiResponse.status) {
            SmartContractAbi = JSON.parse(SmartContractAbiResponse.data);
            await Settings.setKey("nexus_smart_contract_abi", SmartContractAbi);
        }
    }

    /**
     * TODO : Check JSON Schema Of SmartContractAbi for ABI Format
     */
    NexusSmartContractAbi = SmartContractAbi ? SmartContractAbi : NexusSmartContractAbi;

}

exports.getAbiOfSmartContract = async () => {
    let chainId = config.is_mainnet ? config.SupportedChainId.MAINNET : config.SupportedChainId.KOVAN;
    let SmartContractAbi = await web3Connection.getAbiOfSmartContract(this.getCurrentSmartContractAddress(), chainId);
    return SmartContractAbi;
}

exports.getCurrentSmartContractAddress = () => {
    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.nexusMutual[config.SupportedChainId.MAINNET] : contracts.nexusMutual[config.SupportedChainId.KOVAN];
    return SmartContractAddress;
}

let NexusStartContract;
let NexusEventSubscription;

exports.connectSmartContract = async () => {
    const web3Connect = await this.getWeb3Connect();

    let SmartContractAddress;

    SmartContractAddress = config.is_mainnet ? contracts.nexusMutual[config.SupportedChainId.MAINNET] : contracts.nexusMutual[config.SupportedChainId.KOVAN];

    try {
        try {
            if (NexusStartContract) {
                let productId = await NexusStartContract.methods.productIds().call()
                if (productId >= 0) {
                    return NexusStartContract;
                }
            }
        } catch (error) {
            /**
             * TODO: Send Error Report: issue on connect smart contract
             * data : smart_contract, config.is_mainnet, 
             */
        }
        NexusStartContract = new web3Connect.eth.Contract(NexusSmartContractAbi, SmartContractAddress);
        return NexusStartContract;
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}

let TransactionPromises = [];
let IsTransactionRunning = false;

exports.addToSyncTransaction = async (transaction_hash, nexus_from_block) => {
    TransactionPromises.push({ transaction_hash, nexus_from_block });
    if (IsTransactionRunning == false) {
        console.log("NEXUS  ::  Started.");
        while (TransactionPromises.length > 0) {
            IsTransactionRunning = true;
            let promise = TransactionPromises[0];
            // if (TransactionPromises.length == 1) {
            console.log(`NEXUS  ::  Last Transaction Waiting..... ${promise.transaction_hash}`);
            await (new Promise(resolve => setTimeout(resolve, config.sync_time_web3_smart_contract))) // 1min
            // }
            await this.syncTransaction(promise.transaction_hash);
            console.log("NEXUS  ::  Completed ", promise.transaction_hash);
            if (promise.nexus_from_block) {
                if(!(process.env.UPDATE_NEXUS_FROM_BLOCK_OFF && process.env.UPDATE_NEXUS_FROM_BLOCK_OFF == "1")) await Settings.setKey("nexus_from_block", promise.nexus_from_block)
            }
            TransactionPromises.splice(0, 1);
            console.log("NEXUS  ::  Rest ", TransactionPromises.length);
            if (TransactionPromises.length == 0) {
                IsTransactionRunning = false;
            }
        }
        console.log("NEXUS  ::  Completed.");
    } else {
        console.log("NEXUS  ::  Already running.....");
    }
}

exports.policySync = async () => {

    let FromBlock = await Settings.getKey("nexus_from_block");
    FromBlock = FromBlock ? FromBlock : 0;

    try {
        let web3Connect = await this.getWeb3Connect();

        await this.connectSmartContract();

        NexusEventSubscription = await NexusStartContract.events.allEvents({ fromBlock: FromBlock })

        /**
         * BuyNexusMutual
         * These event execute from Nexus SmartContract 
         * Only when any user purchase successfully InsureAce product
         * This function will match event data with current database,
         * If there any new product found it will insert data to database
         */
        NexusEventSubscription.on('data', async (event) => {
            if (["BuyNexusMutual"].includes(event.event)) {
                // Find Policy
                await this.addToSyncTransaction(event.transactionHash, event.blockNumber);
            }
        })

        // NexusEventSubscription.on('changed', changed => console.log("CHANGED ", changed))
        // NexusEventSubscription.on('connected', str => console.log("CONNECTED ", str))
        NexusEventSubscription.on('error', str => {
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
    return await web3Connection.getTransaction("nexus", transaction_hash);
}

exports.getTransactionReceipt = async (transaction_hash) => {
    return await web3Connection.getTransactionReceipt("nexus", transaction_hash);
}

exports.checkPolicyNeedToSync = (policy) => {
    return (
        !policy || policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment ||
        (
            policy.product_type == constant.ProductTypes.smart_contract &&
            (
                !policy.SmartContract.block ||
                !policy.SmartContract.coverId
            )
        ) ||
        (
            policy.product_type == constant.ProductTypes.crypto_exchange &&
            (
                !policy.CryptoExchange.block ||
                !policy.CryptoExchange.coverId
            )
        )
    )
}

exports.syncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;

    if (
        true ||
        !policy ||
        this.checkPolicyNeedToSync()
    ) {
        let web3Connect = await this.getWeb3Connect();

        // Get Transaction details
        let TransactionDetails = await this.getTransaction(transaction_hash);

        // let TransactionInput = TransactionDetails.input;
        // let InputData = "0x" + TransactionInput.slice(10);
        // let Params = web3Connect.eth.abi.decodeParameters(['address', 'bytes', 'bytes32', 'bytes32', 'uint8'], InputData);

        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);
        // console.log("TransactionReceiptDetails ", TransactionReceiptDetails.logs.length);

        // BuyNexusMutual Event Log
        let BuyNexusMutualEventAbi = NexusSmartContractAbi.find(value => value.name == "BuyNexusMutual" && value.type == "event");
        let hasBuyNexusMutualEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyNexusMutualEventAbi);
        let BuyNexusMutualEventDetails = web3Connection.decodeEventParametersLogs(web3Connect, BuyNexusMutualEventAbi, hasBuyNexusMutualEvent);
        console.log("BuyNexusMutualEventDetails", BuyNexusMutualEventDetails);

        // CoverDetailsEvent Log
        let CoverDetailsEventEventAbi = NexusQuotationDataSmartContractAbi.find(value => value.name == "CoverDetailsEvent" && value.type == "event");
        let hasCoverDetailsEventEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, CoverDetailsEventEventAbi);

        if (hasBuyNexusMutualEvent) {

            if (!hasCoverDetailsEventEvent) {
                /**
                 * TODO: Send Error Report (critical)
                 * Message : CoverDetailsEvent does not exist in transaction
                 * "kovan", transaction_hash
                 */
            }

            // console.log("hasCoverDetailsEventEvent ", hasCoverDetailsEventEvent);
            let details = web3Connection.decodeEventParametersLogs(web3Connect, CoverDetailsEventEventAbi, hasCoverDetailsEventEvent);
            let event_cover_details = {
                address: details.scAdd,
                expiry: details.expiry,
                sumAssured: details.sumAssured,
                premium: details.premium,
                premiumNXM: details.premiumNXM
            }

            let cover_details = await Settings.getKey("cover_details");
            cover_details = Array.isArray(cover_details) ? cover_details : [];
            let blog_details = await web3Connect.eth.getBlock(TransactionDetails.blockNumber);
            let duration_days = utils.getTimestampDiff(blog_details.timestamp, event_cover_details.expiry);

            let wallet_address;

            // MetaTransactionExecuted Log
            let MetaTransactionExecutedEventAbi = NexusSmartContractAbi.find(value => value.name == "MetaTransactionExecuted" && value.type == "event");
            let hasMetaTransactionExecutedEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, MetaTransactionExecutedEventAbi);
            if (hasMetaTransactionExecutedEvent) {
                let MetaTransactionExecutedData = web3Connection.decodeEventParametersLogs(web3Connect, MetaTransactionExecutedEventAbi, hasMetaTransactionExecutedEvent);
                wallet_address = MetaTransactionExecutedData.userAddress;
            } else {
                // Transfer Log
                let TransferEventAbi = TransferAbi.find(value => value.name == "Transfer" && value.type == "event");
                let hasTransferEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, TransferEventAbi, { findTopics: { from: this.getCurrentSmartContractAddress() } });
                let transferEventIndexedData = hasTransferEvent ? web3Connection.decodeEventIndexedDataLogs(web3Connect, TransferEventAbi, hasTransferEvent) : false;
                if (transferEventIndexedData) {
                    wallet_address = transferEventIndexedData.to;
                }
            }

            // CoverBought Log
            let CoverBoughtEventAbi = CoverBoughtAbi.find(value => value.name == "CoverBought" && value.type == "event");
            let hasCoverBoughtEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, CoverBoughtEventAbi, { findTopics: { buyer: this.getCurrentSmartContractAddress() } });
            let coverBoughtEventIndexedData = hasCoverBoughtEvent ? web3Connection.decodeEventIndexedDataLogs(web3Connect, CoverBoughtEventAbi, hasCoverBoughtEvent) : false;
            if (!hasCoverBoughtEvent) {
                /**
                 * TODO: Send Error Report
                 * Message - Nexus Transaction does not includes CoverBought Event
                 * transaction_hash, config.is_mainnet
                 */
            }

            // Get Currency and Amount Detail
            let currency_address =  _.get(BuyNexusMutualEventDetails, "_buyToken", null);
            let crypto_amount =   _.get(BuyNexusMutualEventDetails, "_tokenAmount", null);

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
            }else{
                /**
                 * TODO: Send Error Report
                 * currency_address does not found in existing list
                 * "nexus", config.is_mainnet, currency_address, transaction_hash
                 */
            }

            let event_cover_bought_details = {
                coverId: _.get(coverBoughtEventIndexedData, "coverId", null)
            };

            if (!policy) {

                let cover = cover_details.find(value => {
                    return value && _.get(value, "address", false) == event_cover_details.address && _.get(value, "company_code", false) == "nexus"
                })

                let type = (cover && constant.CryptoExchangeTypes.includes(cover.type)) ? constant.ProductTypes.crypto_exchange : constant.ProductTypes.smart_contract;
                // let wallet_address = TransactionDetails.from;
                policy = new Policies;
                policy.user_id = await Users.getUser(wallet_address);
                policy.product_type = type;
                policy.wallet_address = wallet_address;
                policy.payment_hash = transaction_hash;

                if (!cover) {
                    /**
                     * TODO: Send Error Report(critical)
                     * Message : Cover does not exist in list
                     * transaction_hash, "KOVAN"
                     */
                }

                let policyType = policy.product_type == constant.ProductTypes.crypto_exchange ? "CryptoExchange" : "SmartContract";

                policy[policyType] = {
                    company_code: "nexus",
                    product_id: _.get(cover, "product_id", null),
                    unique_id: _.get(cover, "unique_id", null),
                    address: _.get(cover, "address", null),
                    name: _.get(cover, "name", null),
                    type: _.get(cover, "type", null),
                    chain: "ethereum",
                    crypto_currency: crypto_currency,
                    crypto_amount: crypto_amount
                }

                await policy.save()
            }
            if (
                policy &&
                ( this.checkPolicyNeedToSync() || true )
            ) {
                let chain = web3Connect.utils.toDecimal(TransactionDetails.chainId)

                let policyType = policy.product_type == constant.ProductTypes.crypto_exchange ? "CryptoExchange" : "SmartContract";
                policy[policyType].expiry = event_cover_details.expiry;
                policy[policyType].sumAssured = event_cover_details.sumAssured;
                policy[policyType].premium = event_cover_details.premium;
                policy[policyType].premiumNXM = event_cover_details.premiumNXM;
                policy[policyType].duration_days = duration_days;
                policy[policyType].block = TransactionDetails.blockNumber;
                policy[policyType].network = chain;
                policy[policyType].coverId = event_cover_bought_details.coverId;

                policy.crypto_currency = crypto_currency;
                policy.crypto_amount = crypto_amount;
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
                // payment.currency = crypto_currency;
                // payment.paid_amount = policy.total_amount;
                payment.network = chain;
                payment.crypto_currency = crypto_currency;
                payment.crypto_amount = crypto_amount;
                payment.currency_address = currency_address;
                await payment.save();

                policy.payment_id = payment._id;
                await policy.save();
                await Settings.setKey("nexus_last_sync_transaction", transaction_hash)
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