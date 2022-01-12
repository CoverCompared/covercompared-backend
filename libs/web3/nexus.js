const web3Connection = require('./index');
const NexusSmartContractAbi = require("./../abi/nexus.json");
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
            await this.syncTransaction(promise.transaction_hash);
            console.log("NEXUS  ::  Completed ", promise.transaction_hash);
            if (promise.nexus_from_block) {
                await Settings.setKey("nexus_from_block", promise.nexus_from_block)
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
         * These event execute from InsurAce SmartContract 
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

        // let TransactionInput = TransactionDetails.input;
        // let InputData = "0x" + TransactionInput.slice(10);
        // let Params = web3Connect.eth.abi.decodeParameters(['address', 'bytes', 'bytes32', 'bytes32', 'uint8'], InputData);

        let TransactionReceiptDetails = await this.getTransactionReceipt(transaction_hash);
        // console.log("TransactionReceiptDetails ", TransactionReceiptDetails.logs.length);

        // BuyNexusMutual Event Log
        let BuyNexusMutualEventAbi = NexusSmartContractAbi.find(value => value.name == "BuyNexusMutual" && value.type == "event");
        let hasBuyNexusMutualEvent = web3Connection.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyNexusMutualEventAbi);

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

            if (!policy) {

                let cover = cover_details.find(value => {
                    return value && _.get(value, "address", false) == event_cover_details.address && _.get(value, "company_code", false) == "nexus"
                })

                let type = cover && constant.CryptoExchangeTypes.includes(cover.type) ? constant.ProductTypes.crypto_exchange : constant.ProductTypes.smart_contract;
                let wallet_address = TransactionDetails.from;
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
                    crypto_currency: null,
                    crypto_amount: null
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

                let policyType = policy.product_type == constant.ProductTypes.crypto_exchange ? "CryptoExchange" : "SmartContract";
                policy[policyType].expiry = event_cover_details.expiry;
                policy[policyType].sumAssured = event_cover_details.sumAssured;
                policy[policyType].premium = event_cover_details.premium;
                policy[policyType].premiumNXM = event_cover_details.premiumNXM;
                policy[policyType].duration_days = duration_days;
                policy[policyType].block = TransactionDetails.blockNumber;
                policy[policyType].network = chain;

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
                payment.wallet_address = TransactionDetails.from;
                payment.block_timestamp = _.get(blog_details, "timestamp", null);
                payment.txn_type = "onchain";
                payment.payment_hash = transaction_hash;
                // payment.currency = crypto_currency;
                // payment.paid_amount = policy.total_amount;
                payment.network = chain;
                // payment.crypto_currency = crypto_currency;
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