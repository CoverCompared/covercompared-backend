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

let web3 = {
    [config.SupportedChainId.MAINNET]: undefined,
    [config.SupportedChainId.RINKEBY]: undefined,
    [config.SupportedChainId.KOVAN]: undefined,
};

/**
 * Return web3 is connected
 * @param {"p4l"} smart_contract 
 */
exports.isListening = async (smart_contract) => {
    let web3Connect = this.getWeb3Connect(smart_contract);
    if (!web3Connect) {
        return false;
    } else {
        try {
            return await web3Connect.eth.net.isListening();
        } catch (error) {
            console.log("Error", error);
            return false;
        }
    }
}

exports.connect = () => {
    return new Promise((resolve, reject) => {
        try {
            if (config.is_mainnet) {
                web3[config.SupportedChainId.MAINNET] = new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.MAINNET]));
            } else {
                if (web3[config.SupportedChainId.RINKEBY]) {
                    web3[config.SupportedChainId.RINKEBY].eth.clearSubscriptions()
                }

                web3[config.SupportedChainId.RINKEBY] = new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.RINKEBY]));
                web3[config.SupportedChainId.KOVAN] = new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[config.SupportedChainId.KOVAN]));

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
 * @param {"p4l"} smart_contract 
 */
exports.getWeb3Connect = (smart_contract) => {
    let web3Connect;
    if (config.is_mainnet) {
        web3Connect = web3[config.SupportedChainId.MAINNET];
    } else {
        if (smart_contract == "p4l") {
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
                if(P4LStartContract){
                    let productId = P4LStartContract.methods.productIds().call()
                    if(productId){
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

        if(hasBuyProductEvent || hasBuyP4LEvent){

            // Get ProductId from Transaction
            let productId;
            if(hasBuyProductEvent){ 
                productId = web3Connect.utils.toDecimal(hasBuyProductEvent.topics[1])
            }else if(hasBuyP4LEvent){
                productId = web3Connect.utils.toDecimal(hasBuyP4LEvent.topics[1])
            }

            
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

exports.p4lPolicySync = async () => {

    const P4lProductIdCount = 0;
    const P4LFromBlock = 0;

    try {
        let web3Connect = this.getWeb3Connect("p4l");
        await this.connectSmartContract("p4l");

        P4LEventSubscription = await P4LStartContract.events.allEvents({ fromBlock: P4LFromBlock })

        // let LogSubscription = web3[config.SupportedChainId.RINKEBY].eth.subscribe("logs", { address: contracts.p4l[config.SupportedChainId.RINKEBY], fromBlock: "0" }, function (error, result) {
        //     if (!error && result.transactionHash == "0x15aacd064e06c63f34e9da1db6fbff140a2fd7c73be5e2f9cb33ade84e0aabe8")
        //         console.log("Log ", result);
        // }).on("connected", function(subscriptionId){
        //     console.log("Connected ", subscriptionId);
        // })

        // let transaction = await web3[config.SupportedChainId.RINKEBY].eth.getTransaction("0x15aacd064e06c63f34e9da1db6fbff140a2fd7c73be5e2f9cb33ade84e0aabe8")
        // let TransactionReceipt = await web3[config.SupportedChainId.RINKEBY].eth.getTransactionReceipt("0x15aacd064e06c63f34e9da1db6fbff140a2fd7c73be5e2f9cb33ade84e0aabe8")
        // console.log("Transaction Receipt ", TransactionReceipt.logs);
        // let transferMethod = web3[config.SupportedChainId.RINKEBY].utils.sha3('Transfer(address,address,uint256)');
        // let transferDetails = TransactionReceipt.logs.find(value => {
        //     return value.topics.find(topic => topic == transferMethod)
        // })
        // console.log("transferDetails ", transferDetails);
        // if (transferDetails) {
        //     let data = web3[config.SupportedChainId.RINKEBY].eth.abi.decodeParameter("uint256", transferDetails.data);
        //     console.log(data / (10 ** 18));
        // }

        // .on("data", function(log){
        //     console.log("Data  ",log);
        // })
        // .on("changed", function(log){
        // });

        /**
         * BuyP4L, BuyProduct 
         * These event execute from P4L SmartContract 
         * Only when any user purchase successfully p4l product
         * This function will match event data with current database,
         * If there any new product found it will insert data to database
         */
        P4LEventSubscription.on('data', async (event) => {
            
            if (["BuyP4L", "BuyProduct"].includes(event.event)) {

            /**
             * Get product details from _productId
             */
            //     let product = await P4LStartContract.methods.products(event.returnValues._productId).call()

            // Find Policy
                await this.p4lSyncTransaction(event.transactionHash);
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
    
    if(Array.isArray(TransactionReceipt.logs)){
        logEvent = TransactionReceipt.logs.find(log => {
            return log.topics.find(topic => topic == methodSha3)
        })
        return logEvent;
    }

    return false
}