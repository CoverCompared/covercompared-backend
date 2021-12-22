const Web3 = require("web3");
const config = require("../config");
const P4LSmartContractAbi = require("./abi/p4l.json");
const contracts = require("./contracts");

const _ = require('lodash');
const moment = require('moment');
const mongoose = require("mongoose");
const constant = require("./constants");
const utils = require("./utils");
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');
const Payments = mongoose.model('Payments');
const Settings = mongoose.model('Settings');

let web3 = {
    [config.SupportedChainId.MAINNET]: undefined,
    [config.SupportedChainId.RINKEBY]: undefined,
    [config.SupportedChainId.KOVAN]: undefined,
};

/**
 * Return web3 is connected
 */
exports.isListening = async (web3Connect) => {
    if (!web3Connect) {
        return false;
    } else {
        try {
            return await web3Connect.eth.net.isListening();
        } catch (error) {
            return false;
        }
    }
    return false;
}

exports.connect = () => {
    return new Promise(async (resolve, reject) => {
        try {
            if (config.is_mainnet) {
                web3[config.SupportedChainId.MAINNET] = await this.isListening(web3[config.SupportedChainId.MAINNET]) ? web3[config.SupportedChainId.MAINNET] : new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.MAINNET]));
            } else {
                web3[config.SupportedChainId.RINKEBY] = await this.isListening(web3[config.SupportedChainId.RINKEBY]) ? web3[config.SupportedChainId.RINKEBY] : new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.RINKEBY]));
                web3[config.SupportedChainId.KOVAN] = await this.isListening(web3[config.SupportedChainId.KOVAN]) ? web3[config.SupportedChainId.KOVAN] : new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.KOVAN]));
                // web3[config.SupportedChainId.RINKEBY].eth.clearSubscriptions()
            }
            resolve(web3);
        } catch (error) {
            /**
             * TODO: Send Error Report web3 connection issue.
             *  */
            console.log("ERROR", error);
            resolve(web3);
        }
    })
}

/**
 * Return web3 connect based on smart contract and network(mainnet or testnet)
 * @param {"p4l"|"mso"} smart_contract 
 */
exports.getWeb3Connect = (smart_contract) => {
    let web3Connect;
    if (config.is_mainnet) {
        web3Connect = web3[config.SupportedChainId.MAINNET];
    } else {
        if (["p4l", "mso"].includes(smart_contract)) {
            web3Connect = web3[config.SupportedChainId.RINKEBY];
        }
    }
    return web3Connect;
}

/**
 * It will get Transaction Receipt
 * @param {"p4l"} smart_contract 
 * @param {*} transaction_hash 
 */
exports.getTransactionReceipt = async (smart_contract, transaction_hash) => {

    const web3Connect = this.getWeb3Connect(smart_contract);
    let TransactionReceipt;
    try {
        TransactionReceipt = await web3Connect.eth.getTransactionReceipt(transaction_hash)
    } catch (error) {
        /**
         * TODO: Send Error report: issue while getting transaction receipt from transaction hash
         * data : smart_contract, transaction_hash, config.is_mainnet
         */
    }

    return TransactionReceipt;
}

/**
 * It will get Transaction details
 * @param {"p4l"} smart_contract 
 * @param {*} transaction_hash 
 */
exports.getTransaction = async (smart_contract, transaction_hash) => {

    const web3Connect = this.getWeb3Connect(smart_contract);

    let TransactionDetails;
    try {
        TransactionDetails = await web3Connect.eth.getTransaction(transaction_hash)
    } catch (error) {
        /**
         * TODO: Send Error report: issue while getting transaction from transaction hash
         * data : smart_contract, transaction_hash, config.is_mainnet
         * error : 
         */
    }

    return TransactionDetails;
}

let P4LStartContract;
let P4LEventSubscription;

/**
 * It will return Web3 connected SmartContract  
 * @param {"p4l"} smart_contract 
 */
exports.connectSmartContract = async (smart_contract) => {
    const web3Connect = this.getWeb3Connect(smart_contract);

    let SmartContractAddress;

    if (smart_contract == "p4l") {
        SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];
    }

    try {
        if (smart_contract == "p4l") {
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
        }
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}


exports.p4lSyncTransaction = async (transaction_hash) => {

    // Find Policy
    let policy = await Policies.findOne({ payment_hash: transaction_hash });
    // console.log("policy ", policy);
    let payment = policy && utils.isValidObjectID(policy.payment_id) ? await Payments.findOne({ _id: policy.payment_id }) : null;

    if (
        !policy ||
        policy.payment_status != constant.PolicyPaymentStatus.paid ||
        !policy.payment_id || !payment || !policy.DeviceInsurance.contract_product_id
    ) {
        let web3Connect = this.getWeb3Connect("p4l");

        // Get Transaction details
        let TransactionDetails = await this.getTransaction("p4l", transaction_hash);
        let TransactionReceiptDetails = await this.getTransactionReceipt("p4l", transaction_hash);

        // BuyProduct & BuyP4L Event Log
        let BuyProductEventAbi = P4LSmartContractAbi.find(value => value.name == "BuyProduct" && value.type == "event");
        let hasBuyProductEvent = this.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, BuyProductEventAbi);

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

            // Save in database
            let user = await Users.getUser(TransactionDetails.from);

            if (!policy) {
                // Create policy
                policy = new Policies;


                if (!user) {
                    /**
                     * TODO: Send Error Report : Wallet address exist but user not found
                     */
                    return false;
                }

                policy.user_id = user._id;
                policy.product_type = constant.ProductTypes.device_insurance;
                policy.currency = "USD";
                policy.amount = null;
                policy.discount_amount = null;
                policy.tax = null;
                policy.total_amount = product.priceInUSD / (10 ** 18);
                policy.DeviceInsurance = {
                    device_type: product.device,
                    brand: product.brand,
                    value: null,
                    month: product.purchMonth,
                    durPlan: product.durPlan,
                    purchase_month: _.get(constant.p4lPurchaseMonth, product.durPlan, product.durPlan),
                    model: null,
                    model_name: null,
                    plan_type: null,
                    first_name: null,
                    last_name: null,
                    email: null,
                    phone: null
                }

            }

            policy.DeviceInsurance.contract_product_id = productId;
            policy.status = constant.PolicyStatus.active;
            policy.StatusHistory.push({
                status: policy.status,
                updated_at: new Date(moment()),
                updated_by: user._id
            });
            policy.payment_status = constant.PolicyPaymentStatus.paid;
            policy.payment_hash = transaction_hash;
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
    return true;
}
let P4LTransactionPromises = [];
let IsP4LTransactionRunning = false;

exports.p4lAddToSyncTransaction = async (transaction_hash, p4l_from_block) => {
    P4LTransactionPromises.push({transaction_hash, p4l_from_block});
    if (IsP4LTransactionRunning == false) {
        console.log("P4L  ::  Started.");
        while (P4LTransactionPromises.length > 0) {
            IsP4LTransactionRunning = true;
            let promise = P4LTransactionPromises[0];
            await this.p4lSyncTransaction(promise.transaction_hash);
            console.log("P4L  ::  Completed ", promise.transaction_hash);
            if(promise.p4l_from_block){
                await Settings.setKey("p4l_from_block", promise.p4l_from_block)
            }
            P4LTransactionPromises.splice(0, 1);
            console.log("P4L  ::  Rest ", P4LTransactionPromises.length);
            if (P4LTransactionPromises.length == 0) {
                IsP4LTransactionRunning = false;
            }
        }
        console.log("P4L  ::  Completed.");
    }else{
        console.log("P4L  ::  Already running.....");
    }
}

exports.p4lSignDetails = async (policyId, value, durPlan) => {
    let web3Connect = this.getWeb3Connect("p4l");
    value =  utils.getBigNumber(value);

    try {
        const dataToSign = web3Connect.utils.keccak256(web3Connect.eth.abi.encodeParameters(['string', 'uint256', 'uint256'], [policyId, value, durPlan]));
        const sign = web3Connect.eth.accounts.sign(dataToSign, config.signature_private_key);
        return sign;
    } catch (error) {
        /**
         * TODO: Send Error Report - Issue while sign p4l message
         * */        
    }
    return false;
}

exports.msoSignDetails = async (policyId, priceInUSD, period, conciergePrice) => {
    let web3Connect = this.getWeb3Connect("mso");
    priceInUSD =  utils.getBigNumber(priceInUSD);
    conciergePrice =  utils.getBigNumber(conciergePrice);
    
    try {
        const dataToSign = web3Connect.utils.keccak256(web3Connect.eth.abi.encodeParameters(["string", "uint256", "uint256", "uint256"], [policyId, priceInUSD, period, conciergePrice]));
        const sign = web3Connect.eth.accounts.sign(dataToSign, config.signature_private_key);
        return sign;
    } catch (error) {
        /**
         * TODO: Send Error Report - Issue while sign mso details
         */
    }
    return false;
}

exports.p4lPolicySync = async () => {


    let P4LFromBlock = await Settings.getKey("p4l_from_block");
    P4LFromBlock = P4LFromBlock ? P4LFromBlock : 0;

    try {
        let web3Connect = this.getWeb3Connect("p4l");

        // const policyId = 'P4L-000';
        // const value = utils.getBigNumber(50);
        // const durPlan = 6;

        // const dataToSign = web3Connect.utils.keccak256(web3Connect.eth.abi.encodeParameters(['string', 'uint256', 'uint256'], [policyId, value, durPlan]));
        // const sign = web3Connect.eth.accounts.sign(dataToSign, "77a0a80a9592ff11cf226329d858edad9a472e86f135145b230197dee83247cd");
        // console.log("SIGN ", sign);

        await this.connectSmartContract("p4l");


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

exports.p4lGetProductDetails = async (product_id) => {
    await this.connectSmartContract("p4l");
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

exports.subscriptionStatus = async () => {
    return P4LEventSubscription;
    // P4LEventSubscription.on('connected', (event) => { console.log("Event ", event); })
}

/**
 * 
 * @param {Web3} web3Connect 
 * @param {Object} abi 
 * @param {String} abi.name 
 * @param {"event"} abi.type 
 * @param {Object[]} abi.inputs 
 * @param {String} abi.inputs[].type
 */
exports.checkTransactionReceiptHasLog = (web3Connect, TransactionReceipt, abi) => {
    let methodSha3 = web3Connect.utils.sha3(utils.convertEventToSha3(abi));

    if (Array.isArray(TransactionReceipt.logs)) {
        logEvent = TransactionReceipt.logs.find(log => {
            return log.topics.find(topic => topic == methodSha3)
        })
        return logEvent;
    }

    return false
}