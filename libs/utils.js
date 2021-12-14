const _ = require("lodash");
const NodeCache = require("node-cache");
const config = require("../config");
const myCache = new NodeCache();
const moment = require('moment');

let utils = {};

/**
 * 
 * @param {boolean} status 
 * @param {Object} error 
 * @returns 
 */
utils.apiResponseError = (status, error = {}) => {
    return { 'success': status, 'message': 'Something went wrong.', 'data': {}, 'errors': error };
}

/**
 * 
 * @param {Boolean} status 
 * @param {string} msg 
 * @param {any} data    
 * @param {any} error 
 * @returns 
 */
utils.apiResponse = (status, msg, data = {}, error = {}) => {
    return { 'success': status, 'message': msg, 'data': data, 'errors': error };
}

utils.apiResponseData = (status, data = {}, error = {}) => {
    return { 'success': status, 'message': '', 'data': data, 'errors': error };
}

utils.apiResponseMessage = (status, msg) => {
    return { 'success': status, 'message': msg, 'data': {}, 'errors': {} };
}

/**
 * 
 * @param {string} url 
 * @param {Object} queryParams 
 * @returns 
 */
utils.addQueryParams = (url, queryParams) => {
    queryParams = _.map(queryParams, (value, key) => {
        return `${key}=${value}`;
    })
    queryParams = Object.values(queryParams).join("&")

    return `${url}?${queryParams}`;
}

/**
 * 
 * @param {string|Array} supportedChain 
 * @returns 
 */
utils.convertSupportedChain = (supportedChain) => {
    let overrideValues = {
        ethereum: "Ethereum",
        bsc: "BSC",
        polygon: "Polygon",
        fantom: "Fantom",
        xdai: "xDai",
        terra: "Terra"
    }

    if (typeof supportedChain == "string") {
        supportedChain = overrideValues[supportedChain] ? overrideValues[supportedChain] : supportedChain
    } else {
        supportedChain = supportedChain.map(chain_type => {
            return overrideValues[chain_type] ? overrideValues[chain_type] : chain_type
        })
    }
    return supportedChain;
}

utils.getCompanyCoverList = async (company) => {
    coverList = myCache.get(`${company.code}CoverList`);
    if (coverList == undefined) {
        coverList = await company.coverList()
        myCache.set(`${company.code}CoverList`, coverList, config.cache_time)
    }
    return coverList;
}

utils.getSmartContractLogo = async (unique_id, logo_details = undefined) => {
    logo = myCache.get(`${unique_id}Logo`);
    if (logo == undefined && logo_details != undefined) {
        myCache.set(`${unique_id}Logo`, logo_details, 86400)
        logo = logo_details
    }
    return logo;
}

utils.getCurrencyList = async (key, setValue) => {
    value = myCache.get(key);
    if (value == undefined) {
        value = await setValue()
        myCache.set(key, value, 86400)
    }
    return value;
}


utils.convertToCurrency = (amount, decimal) => {
    return BigInt(amount * (10 ** decimal)).toString()
}

/**
 * Used to Create unique value for cover details
 * @param {*} product_id 
 * @param {*} address 
 * @param {*} company_code 
 * @returns 
 */
utils.getUniqueCoverID = (product_id, address, company_code) => {
    return `${product_id}.${address}.${company_code}`;
}

utils.getEmailOtp = () => {
    return Math.ceil(Math.random() * 1000000)
}

/**
 * If you pass "1" => "001"
 * @param {Number} number 
 * @returns 
 */
utils.getPadNumber = (number) => {
    return `${_.padStart((number), 3, '0')}`
}


utils.getFormattedAmount = (amount) => {
    amount = parseFloat(amount).toFixed(3);
    amount = amount === "NaN" ? "0.000" : amount
    amount = amount.split(".");
    amount[0] = parseInt(amount[0]).toLocaleString()
    return amount.join(".");
}

utils.getFormattedDate = (timestamp) => {
    try {
        let time = moment(timestamp).format('LL')
        return time;
    } catch (error) {
        console.log(error);
        return "-";
    }
}

utils.getFormattedDateTime = (timestamp) => {
    try {
        let time = moment(timestamp).format('LLL')
        return time;
    } catch (error) {
        return "-";
    }
}


utils.getErrorMessage = (errors) => {
    return _.get(Object.values(errors), "0.message", "");
}

module.exports = utils;