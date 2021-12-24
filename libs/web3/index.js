const Web3 = require("web3");
const config = require("../../config");
const P4LSmartContractAbi = require("./../abi/p4l.json");
const MSOSmartContractAbi = require("./../abi/mso.json");
const contracts = require("./../contracts");

const _ = require('lodash');
const moment = require('moment');
const mongoose = require("mongoose");
const constant = require("./../constants");
const utils = require("./../utils");
const Policies = mongoose.model('Policies');
const Payments = mongoose.model('Payments');
const Settings = mongoose.model('Settings');
const signMsg = require("./../sign_message");
const { ethers } = require("ethers");

exports.smart_contracts = {
    p4l : require("./p4l"),
    mso : require('./mso')
}


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
 * @param {"p4l"|"mso"} smart_contract 
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
 * @param {"p4l"|"mso"} smart_contract 
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
 * @param {"p4l"|"mso"} smart_contract 
 */
exports.connectSmartContract = async (smart_contract) => {
    const web3Connect = this.getWeb3Connect(smart_contract);

    let SmartContractAddress;

    if (smart_contract == "p4l") {
        SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];
    }else if (smart_contract == "mso") {
        SmartContractAddress = config.is_mainnet ? contracts.mso[config.SupportedChainId.MAINNET] : contracts.mso[config.SupportedChainId.RINKEBY];
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
        }else if (smart_contract == "mso") {
            try {
                if (MSOStartContract) {
                    let productId = MSOStartContract.methods.productIds().call()
                    if (productId) {
                        return MSOStartContract;
                    }
                }
            } catch (error) {
            }
            MSOStartContract = new web3Connect.eth.Contract(MSOSmartContractAbi, SmartContractAddress);
            return MSOStartContract;
        }
    } catch (error) {
        /**
         * TODO: Send Error Report: issue on connect smart contract
         * data : smart_contract, config.is_mainnet, 
         */
    }
}


exports.p4lSignDetails = async (policyId, value, durPlan) => {
    let web3Connect = this.getWeb3Connect("p4l");

    try {
        let message = signMsg.getSignMessage({
            total_amount: value,
            id: policyId,
            durPlan
        })
        // const dataToSign = web3Connect.utils.keccak256(web3Connect.eth.abi.encodeParameters(['string', 'uint256', 'uint256'], [policyId, value, durPlan]));
        const sign = web3Connect.eth.accounts.sign(ethers.utils.keccak256(message), config.signature_private_key);
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
    priceInUSD = utils.getBigNumber(priceInUSD);
    conciergePrice = utils.getBigNumber(conciergePrice);

    try {
        let message = signMsg.getSignMessageForMSO({ policyId, value: priceInUSD, period, conciergePrice })
        // const dataToSign = web3Connect.utils.keccak256(web3Connect.eth.abi.encodeParameters(["string", "uint256", "uint256", "uint256"], [policyId, priceInUSD, period, conciergePrice]));
        const sign = web3Connect.eth.accounts.sign(ethers.utils.keccak256(message), config.signature_private_key);
        return sign;
    } catch (error) {
        /**
         * TODO: Send Error Report - Issue while sign mso details
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

exports.getAddressOfSignatureAccount = (smart_contract) => {
    let web3Connect = this.getWeb3Connect(smart_contract);
    let address = web3Connect.eth.accounts.privateKeyToAccount(config.signature_private_key);
    return _.get(address, "address");
}