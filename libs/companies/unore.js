
const { unore } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");

const mongoose = require('mongoose');
const config = require("../../config");
const SmartContractLogos = mongoose.model("SmartContractLogos");


exports.code = unore.code;
exports.company = unore

exports.coverList = async () => {

    let list = [
        {
            unique_id : utils.getUniqueCoverID("Umbrella Network", "", this.company.code),
            product_id: "",
            address: "",
            name: "Umbrella Network",
            type: "protocol",
            company: this.company.name,
            company_code: this.company.code,
            company_icon: this.company.icon,
            min_eth: this.company.min_eth,
            capacity: "",
            logo_endpoint : "UmbrellaNetwork.jpg",
            supportedChains: ["Ethereum"],
            currency: ["ETH"], currency_limit : { "ETH": {
                "min": 0.1,
                "max": 3.3946
            }},
            duration_days_min: 15,
            duration_days_max: 365,
            is_coming_soon: true
        },
        {
            unique_id : utils.getUniqueCoverID("Rocket Vault Finance", "", this.company.code),
            product_id: "",
            address: "",
            name: "Rocket Vault Finance",
            type: "custodian",
            company: this.company.name,
            company_code: this.company.code,
            company_icon: this.company.icon,
            min_eth: this.company.min_eth,
            capacity: "",
            logo_endpoint: "RocketVaultFinance.png",
            supportedChains: ["Ethereum"],
            currency: ["ETH"], currency_limit : { "ETH": {
                "min": 0.1,
                "max": 3.3946
            }},
            duration_days_min: 15,
            duration_days_max: 365,
            is_coming_soon: true
        }
    ]

    list = list.map((data) => {
        let logo_details = utils.getSmartContractLogo(data.unique_id, { logo_endpoint : data.logo_endpoint });

        data.logo = this.getImageUrl(data.logo_endpoint);
        return data;
    });

    return list
}

exports.getQuote = async (product, amount, period, currency = 0) => {
    
    response = { status: false, data: "All Data is static." };

    return response
}

exports.getImageUrl = (logo_endpoint) => {
    if (logo_endpoint) {
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