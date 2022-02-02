const Web3 = require("web3");
const config = require("../../config");
const P4LSmartContractAbi = require("./../abi/p4l.json");
const MSOSmartContractAbi = require("./../abi/mso.json");
const contracts = require("./../contracts");
const axios = require("axios");

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
    p4l: require("./p4l"),
    mso: require('./mso'),
    insurace: require("./insurace"),
    nexus: require("./nexus")
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


// Get Web3Connect
// Check Is Listening
// Connect Web3
// Return web3Connect

/**
 * Return web3 connect based on smart contract and network(mainnet or testnet)
 * @param {"p4l"|"mso"|"insurace"|"nexus"} smart_contract 
 */
exports.getWeb3Connect = async (smart_contract, check_is_connected = false) => {
    let web3Connect;
    let chainId;
    if (config.is_mainnet) {
        chainId = config.SupportedChainId.MAINNET;
    } else {
        if (["p4l", "mso", "insurace"].includes(smart_contract)) {
            chainId = config.SupportedChainId.RINKEBY;
        } else if (["nexus"].includes(smart_contract)) {
            chainId = config.SupportedChainId.KOVAN;
        }
    }

    if (check_is_connected) {
        try {
            let listening = await this.isListening(web3[chainId]);
            if (!listening) {
                web3[chainId] = new Web3(new Web3.providers.WebsocketProvider(config.NETWORK_URLS[chainId]));
            }
        } catch (error) {
            /**
             * TODO: Send Error Report : issue on web3 connect
             * code: web3_connect, 
             * chainId, config.NETWORK_URLS[chainId], error, error.toString()
             */

        }
    }
    return web3[chainId];

}

/**
 * It will get Transaction Receipt
 * @param {"p4l"|"mso"|"insurace"|"nexus"} smart_contract 
 * @param {*} transaction_hash 
 */
exports.getTransactionReceipt = async (smart_contract, transaction_hash) => {

    const web3Connect = await this.getWeb3Connect(smart_contract);
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
 * @param {"p4l"|"mso"|"insurace"|"nexus"} smart_contract 
 * @param {*} transaction_hash 
 */
exports.getTransaction = async (smart_contract, transaction_hash) => {

    const web3Connect = await this.getWeb3Connect(smart_contract);

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
    const web3Connect = await this.getWeb3Connect(smart_contract);

    let SmartContractAddress;

    if (smart_contract == "p4l") {
        SmartContractAddress = config.is_mainnet ? contracts.p4l[config.SupportedChainId.MAINNET] : contracts.p4l[config.SupportedChainId.RINKEBY];
    } else if (smart_contract == "mso") {
        SmartContractAddress = config.is_mainnet ? contracts.mso[config.SupportedChainId.MAINNET] : contracts.mso[config.SupportedChainId.RINKEBY];
    }

    try {
        if (smart_contract == "p4l") {
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
        } else if (smart_contract == "mso") {
            try {
                if (MSOStartContract) {
                    let productId = await MSOStartContract.methods.productIds().call()
                    if (productId >= 0) {
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
    let web3Connect = await this.getWeb3Connect("p4l");

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
        console.log("ERROR ", error);
    }
    return false;
}

exports.msoSignDetails = async (policyId, priceInUSD, period, conciergePrice) => {
    let web3Connect = await this.getWeb3Connect("mso");
    const decimal = config.is_mainnet ? 6 : 18;
    priceInUSD = utils.getBigNumber(priceInUSD, decimal);
    conciergePrice = utils.getBigNumber(conciergePrice, decimal);

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
 * @param {String} abi.inputs[].name
 * @param {Boolean} abi.inputs[].indexed
 * @param {Object} options
 * @param {Boolean} options.getAll
 * @param {Object} options.findTopics
 */
exports.checkTransactionReceiptHasLog = (web3Connect, TransactionReceipt, abi, options = {}) => {
    options.getAll = options.getAll ? options.getAll : false;
    options.findTopics = options.findTopics ? options.findTopics : false;

    let methodSha3 = web3Connect.utils.sha3(utils.convertEventToSha3(abi));

    // Find index of params
    let findIndex;
    let findTopics = false;
    if (options.findTopics) {
        for (const key in options.findTopics) {
            findIndex = abi.inputs.filter(value => value.indexed).findIndex((value) => value.indexed && value.name == key)
            if (findIndex >= 0) {
                findIndex = findIndex + 1;
                find = abi.inputs.filter(value => value.indexed).find((value) => value.indexed && value.name == key)
                findTopics = findTopics ? findTopics : {};
                findTopics[findIndex] = web3Connect.eth.abi.encodeParameter(find.type, options.findTopics[key]);
            }
        }
    }

    if (Array.isArray(TransactionReceipt.logs)) {
        logEvent = TransactionReceipt.logs.filter(log => {
            if (!log.topics.find(topic => topic == methodSha3)) {
                return false
            } else if (findTopics) {
                for (const key in findTopics) {
                    if (
                        key >= log.topics.length ||
                        log.topics[key] != findTopics[key]
                    ) {
                        return false;
                    }
                }
            }
            return true;
        })
        return options.getAll ? logEvent : (logEvent.length > 0 ? logEvent[0] : false);
    }

    return false
}

exports.getValueFromTransactionReceiptLog = (web3Connect, TransactionReceiptLog, abi, fieldName, decode = false) => {

    let findIndex = abi.inputs.filter(value => value.indexed).findIndex((value) => value.indexed && value.name == fieldName)
    if (findIndex >= 0) {
        findIndex = findIndex + 1;
        find = abi.inputs.filter(value => value.indexed).find((value) => value.indexed && value.name == fieldName)
        if (findIndex < TransactionReceiptLog.topics.length) {
            if (decode) {
                let find = abi.inputs.filter(value => value.indexed).find((value) => value.indexed && value.name == fieldName)
                return web3Connect.eth.abi.decodeParameter(find.type, TransactionReceiptLog.topics[findIndex]);
            } else {
                return TransactionReceiptLog.topics[findIndex];
            }
        }
    }


}

exports.getAddressOfSignatureAccount = async (smart_contract) => {
    let web3Connect = await this.getWeb3Connect(smart_contract);
    let address = web3Connect.eth.accounts.privateKeyToAccount(config.signature_private_key);
    return _.get(address, "address");
}

/**
 * 
 * @param {Web3} web3Connect 
 * @param {Object} eventAbi 
 * @param {Array} eventAbi.inputs
 * @param {Object} log 
 * @param {String} log.data
 * @param {Array} log.topics
 */
exports.decodeEventParametersLogs = (web3Connect, eventAbi, log) => {
    let TransactionReceiptLog = Object.assign({}, log);
    let EventAbiClone = Object.assign({}, eventAbi);

    let inputs = EventAbiClone.inputs.filter(value => value.indexed == false);

    return web3Connect.eth.abi.decodeParameters(inputs, TransactionReceiptLog.data);
}

/**
 * 
 * @param {Web3} web3Connect 
 * @param {Object} eventAbi 
 * @param {Array} eventAbi.inputs
 * @param {Object} log 
 * @param {String} log.data
 * @param {Array} log.topics
 */
exports.decodeEventIndexedDataLogs = (web3Connect, eventAbi, log) => {

    let topics = {};

    if (log.topics && log.topics.length) {
        topics[0] = log.topics[0];
        eventAbi.inputs.filter(value => value.indexed).forEach((value, ind) => {
            topics[value.name] = web3Connect.eth.abi.decodeParameter(value.type, log.topics[ind + 1]);
        })
    }

    return topics;
}

/**
 * Function is used to get api from contract address
 * It will call the etherscan api and get the api
 * 
 * @param {*} contract_address 
 * @param {"1"|"4"|"42"} chain_id - (1 - mainnet, 4 - rinkby, 42 - kovan)
 * @returns 
 */
exports.getAbiOfSmartContract = async (contract_address, chain_id) => {

    let params = {
        module: "contract",
        action: "getabi",
        address: contract_address,
        apikey: config.etherscan_key,
    };

    let apiBaseUrls = {
        "1": "https://api.etherscan.io/api",
        "4": "https://api-rinkeby.etherscan.io/api",
        "42": "https://api-kovan.etherscan.io/api"
    }


    var api_config = {
        url: utils.addQueryParams(apiBaseUrls[chain_id], params)
    };

    let response = {};
    try {
        response = await axios(api_config)
        response = _.get(response, "data", {})
        if (response.status == '1') {
            response = { status: true, data: response.result };
        } else {
            response = { status: false, data: response };
        }

    } catch (error) {
        /**
         * TODO: Send Error Report
         * Message : Issue while getting api from contract address
         * chain_id, contract_address, error.toString(), error
         */
        response = { status: false, data: error };
    }
    return response

}

/**
 * Function covert value to display value
 * like: 107999999999999999 to 0.107999999999999999
 * @param {Number} value 
 * @param {"eth"|"cvr"|"dai"} token 
 */
exports.covertToDisplayValue = (web3Connect, value, token) => {
    let unit = "noether";
    if(token == "eth") unit = "ether";
    if(token == "cvr") unit = "ether";
    if(token == "dai") unit = "ether";
    return web3Connect.utils.fromWei(value, unit);
}

// exports.getTransferEventLog = async (web3Connect, TransactionReceiptDetails, fromAddress) => {

//     // Transfer Log
//     let TransferEventAbi = TransferAbi.find(value => value.name == "Transfer" && value.type == "event");
//     let hasTransferEvent = this.checkTransactionReceiptHasLog(web3Connect, TransactionReceiptDetails, TransferEventAbi);

// }

/**
 *  
 * @param {Number} value 
 */
exports.removeDecimalFromUSDPrice = (value) => {
    return ((value) / (10 ** (config.is_mainnet ? 6 : 18)))
}
