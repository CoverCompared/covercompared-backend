
const { unore } = require("../../config/companies")
const _ = require("lodash");
const utils = require("../utils");

exports.code = unore.code;
exports.company = unore

exports.getLogoURL = (logo) => {
    return `${this.company.logo_url}${logo}`;
}

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
            logo: this.getLogoURL("UmbrellaNetwork.jpg"),
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
            logo: this.getLogoURL("RocketVaultFinance.png"),
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

    return list
}

exports.getQuote = async (product, amount, period, currency = 0) => {
    
    response = { status: false, data: "All Data is static." };

    return response
}