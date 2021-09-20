const { default: axios } = require("axios");
const { insurace } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");
const insureLogos = require("./insurace-logos.json");
exports.code = insurace.code;
exports.company = insurace
exports.convertRiskType = (details) => {

    let overrideValues = {
        "Smart Contract Vulnerability": "protocol",
        "Custodian Risk": "custodian",
        "IDO Event Risk": "Decentralized Exchanges",
    }

    if (overrideValues[_.get(details, "risk_type", "")]) {
        return overrideValues[_.get(details, "risk_type", "")]
    } else if (_.get(details, "chain_type", "") == "CEX") {
        return "Centralized exchange";
    }
    return _.get(details, "risk_type", "");
}

exports.currencyList = async () => {

    let currency_list = await utils.getCurrencyList("insurace-currency-list", async () => {
        let chains = { "Ethereum": [], "BSC": [], "Polygon": [] };

        for (const key in chains) {
            var config = {
                url: utils.addQueryParams(this.company.apis.currency_list.url, { code: this.company.access_code }),
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    "chain": key
                }
            };
            let response = {};
            try {
                response = await axios(config)
                chains[key] = _.get(response, "data", []);
            } catch (error) {
                console.log(error);
                chains[key] = [];
            }
        }
        return chains;
    })
    return currency_list;
}

exports.getLogoName = (name) => {
    let logo = insureLogos.find(cover => cover.name == name);
    try {
        return logo ? logo.logo : name.replaceAll(" ", "") + ".png";
    } catch (error) {
        console.log("name", name);
        return "";        
    }
}

exports.coverList = async () => {

    var config = {
        url: utils.addQueryParams(this.company.apis.cover_list.url, { code: this.company.access_code }),
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            "chain": "ETH"
        }
    };
    let response = {};
    try {
        response = await axios(config)
    } catch (error) {
        console.log(error);
        return [];
    }

    let limits = await this.currencyList();
    let list = _.map(_.get(response, "data", []), (data, key) => {
        if (_.get(data, "status", false) != "Enabled" || (_.get(data, "capacity_remaining", 0) / (10 ** 18) <= 0)) {
            return false;
        } else {
            let supportedChain = utils.convertSupportedChain(_.get(data, "chain_type", ""));
            let currency = [];
            let currency_limit = {};

            if (limits[supportedChain] && Array.isArray(limits[supportedChain]) && limits[supportedChain].length) {
                limits[supportedChain].forEach(value => {
                    currency.push(value.name);
                    currency_limit[value.name] = {
                        min: _.get(value, "amount_min", 0) / (10 ** _.get(value, "decimals", 0)),
                        max: _.get(value, "amount_max", 0) / (10 ** _.get(value, "decimals", 0))
                    }
                })
            }

            let name = _.get(data, "name", "");
            let product_id = _.get(data, "product_id", ""); 
            let address = _.get(data, "capacity_currency", ""); 
            let company_code = this.company.code;

            return {
                unique_id : utils.getUniqueCoverID(product_id, address, company_code),
                product_id,
                address,
                name,
                type: this.convertRiskType(data),
                logo: `${this.company.logo_url}${this.getLogoName(name)}`,
                company: this.company.name,
                company_icon: this.company.icon,
                company_code,
                min_eth: this.company.min_eth,
                capacity: (_.get(data, "capacity_remaining", 0) / (10 ** 18)),
                supportedChains: [supportedChain],
                currency, currency_limit,
                duration_days_min: _.get(data, "duration_days_min", 15),
                duration_days_max: _.get(data, "duration_days_max", 365),
            }
        }

    })

    list = _.filter(list);
    return list
}

/**
 * 
 * @param {*} param0 
 * @returns 
 */
exports.getQuote = async ({ product_id, address, amount, period, supported_chain, currency = 'ETH' }) => {

    let limits = await this.currencyList();

    if(!(limits[supported_chain] && Array.isArray(limits[supported_chain]) && limits[supported_chain].length && limits[supported_chain].find(v => v.name == currency))){ 
        console.log("ERROR REPORT");
        console.log("// Send Error Report - Get Quote has issue")
        return {status : false, data : {message: "Currency not found."}};
    }
    let limitCurrency = limits[supported_chain].find(v => v.name == currency);
    let coverCurrency = limitCurrency.address;
    let coverAmounts = utils.convertToCurrency(amount, limitCurrency.decimals)

    let data = {
        chain: supported_chain,
        coverCurrency: coverCurrency,
        productIds: [product_id],
        coverDays: [period],
        coverAmounts: [coverAmounts.toString()],
        "owner": this.company.owner_id,
        "referralCode": ""
    }
    var config = {
        url: utils.addQueryParams(this.company.apis.cover_quote.url, { code: encodeURIComponent(this.company.access_code) }),
        method: "post",
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };
    
    let response = {};
    try {
        response = await axios(config)
        response = _.get(response, "data", {})
        response = { status: true, data: response };
    } catch (error) {
        console.log("// Send Error Report - Get quote response with Eror")
        response = { status: false, data: error };
    }

    return response
}