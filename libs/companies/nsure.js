
const { default: axios } = require("axios");
const { nsure } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");

exports.code = nsure.code;
exports.company = nsure

/**
 * 
 * @param {string|Array} currency 
 * @returns 
 */
exports.convertCurrency = (currency) => {
    let overrideValues = {
        0: "ETH"
    }
    if (typeof currency == "object") {
        currency = currency.map(value => {
            return overrideValues[value] ? overrideValues[value] : value
        })
    } else {
        currency = overrideValues[currency] ? overrideValues[currency] : currency
    }
    return currency;
}

exports.currencyList = async () => {
    let currency = {
        "ETH": { min: 0.1, max: undefined }
    }
    return currency;
}

exports.coverList = async () => {

    var config = { url: this.company.apis.cover_list.url };
    let response = {};
    try {
        response = await axios(config)
    } catch (error) {
        console.log(error);
        return [];
    }

    let currencyList = await this.currencyList();

    let list = _.map(_.get(response, "data.result.list", {}), (data, key) => {
        let currency_max = (_.get(data, "coverAvailableAmount", 0) / (10 ** 18));
        data.currency = data.currency != undefined ? data.currency : 0
        let currency = [this.convertCurrency(data.currency)];
        let currency_limit = {};
        for (const k in currency) {
            if (currencyList[currency[k]]){
                currency_limit[currency[k]] = currencyList[currency[k]];
                currency_limit[currency[k]].max = currency_max;
            }
        }

        return {
            product_id: _.get(data, "uid", ""),
            uid: _.get(data, "uid", ""),
            address: _.get(data, "address", ""),
            name: _.get(data, "name", ""),
            type: _.get(data, "type", "protocol"),
            website: _.get(data, "website", ""),
            company: this.company.name,
            company_code: this.company.code,
            min_eth: this.company.min_eth,
            capacity: currency_max,
            supportedChains: utils.convertSupportedChain(_.get(data, "supportedChains", ["Ethereum"])),
            currency, currency_limit,
            duration_days_min: _.get(data, "minDuration", 15),
            duration_days_max: _.get(data, "maxDuration", 365),
        }
    })
    console.log("list", list[0]);

    return list
}

exports.getQuote = async (product, amount, period, currency = 0) => {
    var config = {
        url: this.company.apis.cover_quote.url,
        method: "POST",
        data: { product, amount, period, currency }
    };

    let response = {};
    try {
        response = await axios(config)
        response = _.get(response, "data", {})
        if (response.code == 200 && response.msg == "ok") {
            response = { status: true, data: response.result };
        } else {
            response = { status: false, data: response };
        }

    } catch (error) {
        response = { status: false, data: error };
    }

    return response
}