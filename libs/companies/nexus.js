const { default: axios } = require("axios");
const { nexus } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");

exports.code = nexus.code;
exports.company = nexus

/**
 * 
 * @param {string|Array} currency 
 * @returns 
 */
exports.convertCurrency = (currency) => {
    let overrideValues = {
        // 0: "ETH"
    }

    if (typeof currency == "string") {
        currency = overrideValues[currency] ? overrideValues[currency] : currency
    } else {
        currency = currency.map(value => {
            return overrideValues[value] ? overrideValues[value] : value
        })
    }
    return currency;
}

exports.currencyList = async () => {
    let currency = {
        "ETH": { min: 1, max: undefined },
        "DAI": { min: 1, max: undefined }
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
    let list = _.map(_.get(response, "data", {}), (data, key) => {
        if (_.get(data, "deprecated", false)) {
            return false;
        } else {
            let currency_limit = {};
            let currency = data.underlyingToken ? [this.convertCurrency(data.underlyingToken)] : this.convertCurrency(["ETH", "DAI"]);

            for (const k in currency) {
                if (currencyList[currency[k]])
                    currency_limit[currency[k]] = currencyList[currency[k]];
            }

            let product_id = null;
            let company_code = this.company.code;
            return {
                unique_id : utils.getUniqueCoverID(product_id, key, company_code),
                product_id,
                address: key,
                logo: `${this.company.logo_url}${_.get(data, "logo", "")}`,
                name: _.get(data, "name", ""),
                type: _.get(data, "type", ""),
                company: this.company.name,
                company_icon: this.company.icon,
                company_code,
                min_eth: this.company.min_eth,
                supportedChains: utils.convertSupportedChain(_.get(data, "supportedChains", [])),
                currency, currency_limit,
                duration_days_min: 30,
                duration_days_max: 365,
            }
        }
    })

    list = _.filter(list);

    return list
}

/**
 * 
 * @param {address} address 
 * @returns 
 */
exports.getCapacity = async (address) => {
    var config = { url: this.company.apis.cover_capacity.url(address) };
    let response = {};
    try {
        response = await axios(config)
    } catch (error) {
        console.log(error);
        return false;
    }

    let capacity = {
        capacityETH: _.get(response, "data.capacityETH", 0) / (10 ** 18),
        capacityDAI: _.get(response, "data.capacityDAI", 0) / (10 ** 6)
    };

    return capacity
}


exports.getQuote = async (contractAddress, coverAmount, currency, period) => {
    var config = {
        url: utils.addQueryParams(this.company.apis.cover_quote.url, {
            contractAddress, coverAmount, currency, period
        })
    };

    let response = {};
    try {
        response = await axios(config)
        response = { status: true, data: _.get(response, "data", {}) };
    } catch (error) {
        response = { status: false, data: error };
    }

    return response
}