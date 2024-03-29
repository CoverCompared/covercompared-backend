const { default: axios } = require("axios");
const { insurace } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");
const insureLogos = require("./insurace-logos.json");

const mongoose = require('mongoose');
const config = require("../../config");
const { _toUtf8String } = require("@ethersproject/strings/lib/utf8");
const SmartContractLogos = mongoose.model("SmartContractLogos");


exports.code = insurace.code;
exports.company = insurace
exports.convertRiskType = (details) => {

    let overrideValues = {
        "Smart Contract Vulnerability": "protocol",
        "Stablecoin De-Peg Risk": "token",
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

exports.convertChainType = (details) => {

    let overrideValues = { 
        CEX: "Ethereum"
    }

    if (overrideValues[_.get(details, "data_source_chain", "")]) {
        return overrideValues[_.get(details, "data_source_chain", "")]
    }
    // if(_.get(details, "chain_type", "") == "Multi-chain")
    // {
    //     return _.get(details, "chain_type_list", "");
    // }

    // if (overrideValues[_.get(details, "chain_type", "")]) {
    //     return overrideValues[_.get(details, "chain_type", "")]
    // }
    return _.get(details, "data_source_chain", "");
}

exports.currencyList = async () => {

    let currency_list = await utils.getCurrencyList("insurace-currency-list", async () => {
        //let chains = { "Ethereum": [], "BSC": [], "Polygon": [] };
        let chains = { "Ethereum": []};
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
        return logo ? logo.logo : name.replace(" ", "") + ".png";
    } catch (error) {
        console.log("name", name);
        console.log("Err", error);
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
            let supportedChain = utils.convertSupportedChain(this.convertChainType(data));
            //let supportedChain = "Ethereum";
            let currency = [];
            let currency_limit = {};
            supportedChain.forEach(chain => {
                if (limits[chain] && Array.isArray(limits[chain]) && limits[chain].length) {
                    limits[chain].forEach(value => {
                        currency.push(value.name);
                        currency_limit[value.name] = {
                            min: _.get(value, "amount_min", 0) / (10 ** _.get(value, "decimals", 0)),
                            max: _.get(value, "amount_max", 0) / (10 ** _.get(value, "decimals", 0))
                        }
                    })
                }
            })          

            let name = _.get(data, "name", "");
            let product_id = _.get(data, "product_id", "");
            let address = _.get(data, "capacity_currency", "");
            let company_code = this.company.code;
            let unique_id = utils.getUniqueCoverID(product_id, address, company_code);
            let logo_endpoint = this.getLogoName(name);
            let logo_details = utils.getSmartContractLogo(unique_id, { logo_endpoint })

            let supportedChains = [supportedChain];
            // if(supportedChain == "CEX"){
            //     supportedChains = [];
            // }

            let chain_type_list = _.get(data, "chain_type_list", []);

            if(
                !chain_type_list || 
                !Array.isArray(chain_type_list) || 
                chain_type_list.length == 0
            ){
                chain_type_list = supportedChains
            }

            return {
                unique_id,
                product_id,
                address,
                name,
                type: this.convertRiskType(data),
                logo: this.getImageUrl(logo_endpoint),
                company: this.company.name,
                company_icon: this.company.icon,
                company_code,
                min_eth: this.company.min_eth,
                capacity: (_.get(data, "capacity_remaining", 0) / (10 ** 18)),
                supportedChains,
                chain_type_list,
                currency, currency_limit,
                duration_days_min: _.get(data, "duration_days_min", 15),
                duration_days_max: _.get(data, "duration_days_max", 365),
            }
        }

    })

    list = _.filter(list);
    return list
}


exports.getQuoteWithPromise = async ({ product_id, address, amount, period, supported_chain, currency = 'ETH', owner_id }) => {
    let limits = await this.currencyList();
    // console.log("limits", limits);

    if (!(limits[supported_chain] && Array.isArray(limits[supported_chain]) && limits[supported_chain].length && limits[supported_chain].find(v => v.name == currency))) {
        console.log("ERROR REPORT");
        console.log("// Send Error Report - Get Quote has issue")
        return { status: false, data: { message: "Currency not found." } };
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
        "owner": owner_id ? owner_id : this.company.owner_id,
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

/**
 * 
 * @param {*} param0 
 * @returns 
 */
exports.getQuote = async ({ product_id, address, amount, period, supported_chain, currency = 'ETH', owner_id }, fromCache = true) => {

    //supported_chain = "Ethereum";

    if(fromCache){
        return await utils.getInsureAceQuote({ product_id, address, amount, period, supported_chain, currency, owner_id }, this.getQuoteWithPromise);
    }

    return await this.getQuoteWithPromise({ product_id, address, amount, period, supported_chain, currency, owner_id });

    // let limits = await this.currencyList();
    // // console.log("limits", limits);

    // if (!(limits[supported_chain] && Array.isArray(limits[supported_chain]) && limits[supported_chain].length && limits[supported_chain].find(v => v.name == currency))) {
    //     console.log("ERROR REPORT");
    //     console.log("// Send Error Report - Get Quote has issue")
    //     return { status: false, data: { message: "Currency not found." } };
    // }
    // let limitCurrency = limits[supported_chain].find(v => v.name == currency);
    // let coverCurrency = limitCurrency.address;
    // let coverAmounts = utils.convertToCurrency(amount, limitCurrency.decimals)

    // let data = {
    //     chain: supported_chain,
    //     coverCurrency: coverCurrency,
    //     productIds: [product_id],
    //     coverDays: [period],
    //     coverAmounts: [coverAmounts.toString()],
    //     "owner": owner_id ? owner_id : this.company.owner_id,
    //     "referralCode": ""
    // }

    // var config = {
    //     url: utils.addQueryParams(this.company.apis.cover_quote.url, { code: encodeURIComponent(this.company.access_code) }),
    //     method: "post",
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     data: data
    // };

    // let response = {};
    // try {
    //     response = await axios(config)
    //     response = _.get(response, "data", {})
    //     response = { status: true, data: response };
    // } catch (error) {
    //     console.log("// Send Error Report - Get quote response with Eror")
    //     response = { status: false, data: error };
    // }

    // return response
}

exports.confirmPremium = async ({ chain, params }) => {
    data = { chain, params };
    var config = {
        url: utils.addQueryParams(this.company.apis.confirm_premium.url, { code: encodeURIComponent(this.company.access_code) }),
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

exports.getImageUrl = (logo_endpoint) => {
    if (logo_endpoint) {
        let replaceValues = {
            "Abracadabra.money.png": "AbracadabraMoney.png",
            "AldrinDEX.png": "Aldrin.png",
            "Beefy.png": "BeefyFinance.png",
            "MCDex.png": "MCDEX.png",
            "PoolTogether V3.png": "PoolTogether.png",
            "Spectrum.png": "SpectrumProtocol.png",
            "TraderJOE.png": "TraderJoe.png",
            "YieldYAK.png": "YieldYak.png",
        }
        logo_endpoint = replaceValues[logo_endpoint] ? replaceValues[logo_endpoint] : logo_endpoint;
        return `${this.company.logo_url}${logo_endpoint}`
    } else {
        return `${config.api_url}images/smart-contract-default.png`
    }
}

exports.getCoverImage = async (unique_id) => {

    // Find from database
    let logo = await SmartContractLogos.findOne({ company_code: this.company.code, unique_id: unique_id });

    if (logo) {
        return this.getImageUrl(_.get(logo, "logo_details.logo_endpoint", false));
    }

    // Check from cache
    let logo_details = await utils.getSmartContractLogo(unique_id);
    if (logo_details != undefined) {
        logo = new SmartContractLogos;
        logo.company_code = this.company.code;
        logo.unique_id = unique_id;
        logo.logo_details = logo_details;
        await logo.save();

        return this.getImageUrl(_.get(logo, "logo_details.logo_endpoint", false));
    }

    // Sync Cover List
    await this.coverList();

    // Check from cache
    logo_details = await utils.getSmartContractLogo(unique_id);
    if (logo_details != undefined) {
        logo = new SmartContractLogos;
        logo.company_code = this.company.code;
        logo.unique_id = unique_id;
        logo.logo_details = logo_details;
        await logo.save();
        return this.getImageUrl(_.get(logo, "logo_details.logo_endpoint", false));
    }

    // Send response
    return `${config.api_url}images/smart-contract-default.png`
}