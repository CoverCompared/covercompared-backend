const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const config_companies = require("../config/companies");
const config = require("../config");
const niv = require("./../libs/nivValidations");

exports.products = async (req, res, next) => {
    res.send(utils.apiResponseData(true, {
        "products": [
            {
                "id": "smart_contract",
                "name": "Smart Contract",
                "type" : "defi",
                "icon": `${config.api_url}images/products/contract1.svg`,
                "details_section" : [
                    {
                        "title" : "address",
                        "provider" : "",
                        "capacity" :""
                    }
                ],
                "partners": [
                    {
                        "partner_id": "nsure",
                        "name": config_companies.nsure.name,
                        "logo": config_companies.nsure.icon,
                    },
                    {
                        "partner_id": "unore",
                        "name": config_companies.unore.name,
                        "logo": config_companies.unore.icon,
                    },
                    {
                        "partner_id": "nexus",
                        "name": config_companies.nexus.name,
                        "logo": config_companies.nexus.icon,
                    },
                    {
                        "partner_id": "insurace",
                        "name": config_companies.insurace.name,
                        "logo": config_companies.insurace.icon,
                    }
                ]
            },
            {
                "id": "crypto_exchange",
                "name": "Crypto Exchange",
                "type" : "defi",
                "icon": `${config.api_url}images/products/cryptocurrency1.svg`,
                "details_section" : [
                    {
                        "title" : "address",
                        "provider" : "",
                        "capacity" :""
                    }
                ],
                "partners": [
                    {
                        "partner_id": "insurace",
                        "name": config_companies.insurace.name,
                        "logo": config_companies.insurace.icon,
                    }
                ]
            },
            {
                "id": "device_insurance",
                "name": "Device Insurance",
                "type" : "defi",
                "icon": `${config.api_url}images/products/device1.svg`,
                "details_section" : [
                    {
                        "title" : "address",
                        "provider" : "",
                        "capacity" :""
                    }
                ],
                "partners": []
            },
            {
                "id": "mso_plans",
                "name": "Medical Second Opinion",
                "type" : "defi",
                "icon": `${config.api_url}images/products/mso-icon.svg`,
                "details_section" : [
                    {
                        "title" : "address",
                        "provider" : "",
                        "capacity" :""
                    }
                ],
                "partners": []
            },
        ]
    }))
}

exports.partners = async (req, res, next) => {
    res.send(utils.apiResponseData(true, {
        "partner_details": [
            {
                "id": "nsure",
                "name": config_companies.nsure.name,
                "integration_contract_address" : "",
                "apis" : [
                    {
                        "network": "ethereum_mainnet",
                        "api" : [
                            {
                                "name" : "product_list",
                                "link" : config_companies.nsure.apis.cover_list.url,
                                "function" : "Provides list of all products availabe on Nexus Mutual",
                                "type" : "GET",
                                "keys" : config_companies.nsure.apis.cover_list.keys
                            },
                            {
                                "name" : "cover_quote",
                                "link" : config_companies.nsure.apis.cover_quote.url,
                                "function" : "Provides list of all products availabe on Nexus Mutual",
                                "type" : "GET",
                                "keys" : config_companies.nsure.apis.cover_quote.keys
                            },
                        ]
                    }
                ]
            }
        ]
    }))
}

exports.list = async (req, res, next) => {

    let search = _.get(req.query, "search", false);
    let company = _.get(req.query, "company", "").split(",");
    let type = _.filter(_.get(req.query, "type", "").split(","));
    let supported_chains = _.filter(_.get(req.query, "supported_chain", "").split(","));
    let currency = _.get(req.query, "currency", "").split(",");
    let current_page = +_.get(req.query, "page", 1);
    let duration_min_day = _.get(req.query, "duration_min_day", false);
    let duration_max_day = _.get(req.query, "duration_max_day", false);
    let amount_min = _.get(req.query, "amount_min", false);
    let amount_max = _.get(req.query, "amount_max", false);
    let get_quote = _.get(req.query, "get_quote", false);

    let { list } = await companies.coverList({
        search,
        companies: _.filter(company),
        type,
        supported_chains: supported_chains,
        currency: _.filter(currency),
        duration_min_day, duration_max_day,
        amount_min, amount_max
    })

    let total = list.length;
    let per_page = 10;
    let total_page = Math.ceil(total / per_page)
    list = list.splice(((current_page - 1) * per_page), per_page)

    if (get_quote == "1") {
        for (const key in list) {
            list[key].quote = false;
            list[key].quote_currency = "";
            list[key].quote_chain = "";
            list[key].quote_amount = "";
            if (
                Array.isArray(list[key].supportedChains)
                && list[key].supportedChains.length
                && Array.isArray(list[key].currency)
                && list[key].currency.length) {
                currency = list[key].currency.find(c => c == "ETH") ? "ETH" : list[key].currency[0];
                if (!(list[key].currency_limit && list[key].currency_limit[currency] && list[key].currency_limit[currency].min)) {
                    console.log("// Send Error Report - Currency Not Found")
                    continue;
                }
                amount = list[key].currency_limit[currency].min;
                
                let chains = [];
                if(supported_chains.length){
                    chains = supported_chains.filter(value => list[key].supportedChains.includes(value));
                }
                chains = chains.length ? chains : list[key].supportedChains;
                
                list[key].quote = await companies.getQuote({
                    company_code: list[key].company_code,
                    address: list[key].address,
                    amount: amount,
                    period: list[key].duration_days_min,
                    supported_chain: chains[0],
                    currency: currency,
                    product_id: _.get(list[key], "product_id", false)
                })
                list[key].quote_currency = currency;
                list[key].quote_chain = chains[0];
                list[key].quote_amount = amount;
            }
        }
    }
    
    res.send(utils.apiResponseData(true, {
        total: total,
        total_page,
        current_page,
        list: list
    }));
}

exports.options = async (req, res, next) => {
    let { supported_chain_option, type_option, duration_days_option, currency_option, amount_option } = await companies.coverListOptions()
    let companies_option = _.map(config_companies, (company, code) => {
        return { name: company.name, code: company.code, icon: company.icon }
    })

    res.send(utils.apiResponseData(true, {
        duration_days_option,
        companies_option,
        type_option,
        supported_chain_option,
        currency_option,
        amount_option
    }));
}

exports.capacity = async (req, res, next) => {
    let rules = {
        'company': ['required', `in:${Object.keys(config_companies).join(",")}`],
        'address': ["required"],
        'product_id': ["nullable"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(v.errors);
        } else {
            let cover = await companies.coverCapacity(req.body.company, req.body.address, _.get(req.body, "product_id", false));
            res.send(utils.apiResponseData(true, cover))
        }
    });

}

exports.minQuote = async (req, res, next) => {
    let rules = {
        'company': ['required', `in:${Object.keys(config_companies).join(",")}`],
        'currency': ["required"],
        'supported_chain': ["required"],
        'address': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(v.errors);
        } else {
            let cover = await companies.coverCapacity(req.body.company, req.body.address, _.get(req.body, "product_id", false));
            if (cover) {

                let quote = await companies.getQuote({
                    company_code: req.body.company,
                    address: req.body.address,
                    amount: req.body.coverAmount,
                    period: req.body.period,
                    supported_chain: req.body.supported_chain,
                    currency: req.body.currency,
                    product_id: _.get(req.body, "product_id", false)
                })
                if (quote !== false) {
                    res.send(utils.apiResponseData(true, quote))
                } else {
                    res.send(utils.apiResponseData(false, quote))
                }
            } else {
                res.send(utils.apiResponseMessage(false, "Product not found."))
            }


        }
    });




}

exports.quote = async (req, res, next) => {
    let rules = {
        'company': ['required', `in:${Object.keys(config_companies).join(",")}`],
        'address': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(v.errors);
        } else {
            let cover = await companies.coverCapacity(req.body.company, req.body.address, _.get(req.body, "product_id", false));
            if (cover) {

                if (req.body.company == config_companies.nexus.code) {

                    let rules = {
                        'currency': ["required", "in:ETH,DAI"],
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(v.errors);
                        } else {
                            let cover = await companies.companies.nexus.getQuote(req.body.address, req.body.coverAmount, req.body.currency, req.body.period)
                            res.send(utils.apiResponseData(cover.status, cover.data))
                        }
                    });

                } else if (req.body.company == config_companies.insurace.code) {
                    let rules = {
                        'currency': ["required", "in:ETH"],
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                        'product_id': ["required"]
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(v.errors);
                        } else {
                            let quote = await companies.companies.insurace.getQuote(
                                {
                                    product_id: cover.product_id,
                                    address: cover.address,
                                    amount: utils.convertToCurrency(req.body.coverAmount, 18),
                                    period: req.body.period,
                                    currency: req.body.currency
                                })
                            res.send(utils.apiResponseData(quote.status, quote.data))
                        }
                    });
                } else if (req.body.company == config_companies.nsure.code) {
                    let rules = {
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(v.errors);
                        } else {
                            let quote = await companies.companies.nsure.getQuote(cover.uid,
                                utils.convertToCurrency(req.body.coverAmount, 18),
                                req.body.period)
                            res.send(utils.apiResponseData(quote.status, quote.data))
                        }
                    });


                } else {
                    res.send(utils.apiResponseMessage(false, 'something-went-wrong'))
                }
            } else {
                res.send(utils.apiResponseMessage(false, "Product not found."))
            }


        }
    });




}