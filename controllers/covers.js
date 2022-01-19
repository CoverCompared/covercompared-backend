const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const config_companies = require("../config/companies");
const config = require("../config");
const niv = require("./../libs/nivValidations");
const constant = require("../libs/constants");

const mongoose = require('mongoose');
const Reviews = mongoose.model('Reviews');
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');


exports.products = async (req, res, next) => {
    res.send(utils.apiResponseData(true, {
        "products": [
            {
                "id": "smart_contract",
                "name": "Smart Contract",
                "type": "defi",
                "icon": `${config.api_url}images/products/contract1.svg`,
                "details_section": [
                    {
                        "title": "address",
                        "provider": "",
                        "capacity": ""
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
                "type": "defi",
                "icon": `${config.api_url}images/products/cryptocurrency1.svg`,
                "details_section": [
                    {
                        "title": "address",
                        "provider": "",
                        "capacity": ""
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
                "type": "defi",
                "icon": `${config.api_url}images/products/device1.svg`,
                "details_section": [
                    {
                        "title": "address",
                        "provider": "",
                        "capacity": ""
                    }
                ],
                "partners": []
            },
            {
                "id": "mso_plans",
                "name": "Medical Second Opinion",
                "type": "defi",
                "icon": `${config.api_url}images/products/mso-icon.svg`,
                "details_section": [
                    {
                        "title": "address",
                        "provider": "",
                        "capacity": ""
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
                "integration_contract_address": "",
                "apis": [
                    {
                        "network": "ethereum_mainnet",
                        "api": [
                            {
                                "name": "product_list",
                                "link": config_companies.nsure.apis.cover_list.url,
                                "function": "Provides list of all products availabe on Nexus Mutual",
                                "type": "GET",
                                "keys": config_companies.nsure.apis.cover_list.keys
                            },
                            {
                                "name": "cover_quote",
                                "link": config_companies.nsure.apis.cover_quote.url,
                                "function": "Provides list of all products availabe on Nexus Mutual",
                                "type": "GET",
                                "keys": config_companies.nsure.apis.cover_quote.keys
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

    // Remove cvr from filer list
    if(Array.isArray(currency) && currency.length && currency.includes("cvr")){
        let cvrIndex = currency.indexOf("cvr");
        currency.splice(cvrIndex, 1);
    }

    if (_.get(req.query, "amount", false)) {
        let amount = req.query.amount.split(",")
        amount_min = new Number(_.get(amount, "0", 0));
        amount_max = new Number(_.get(amount, "1", 0));
    }
    if (_.get(req.query, "duration", false)) {
        let duration = req.query.duration.split(",")
        duration_min_day = new Number(_.get(duration, "0", 0));
        duration_max_day = new Number(_.get(duration, "1", 0));
    }

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
                if (supported_chains.length) {
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
        return company.status ? { name: company.name, code: company.code, icon: company.icon } : false;
    })

    companies_option = _.filter(companies_option);

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
        'company': ['required', `in:${companies.getCompanyCodes().join(",")}`],
        'address': ["required"],
        'product_id': ["nullable"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
        } else {
            let cover = await companies.coverCapacity(req.body.company, req.body.address, _.get(req.body, "product_id", false));
            res.send(utils.apiResponseData(true, cover))
        }
    });

}

exports.minQuote = async (req, res, next) => {
    let rules = {
        'company': ['required', `in:${companies.getCompanyCodes().join(",")}`],
        'currency': ["required"],
        'supported_chain': ["required"],
        'address': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
        'company': ['required', `in:${companies.getCompanyCodes().join(",")}`],
        'address': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
                        } else {
                            let cover = await companies.companies.nexus.getQuote(req.body.address, req.body.coverAmount, req.body.currency, req.body.period)
                            res.send(utils.apiResponseData(cover.status, cover.data))
                        }
                    });

                } else if (req.body.company == config_companies.insurace.code) {
                    let rules = {
                        'currency': ["required"],
                        'owner_id': ["required"],
                        'supported_chain': ["nullable"],
                        //'coverAmount': ["required", "integer"],
                        //'coverAmount': ["required"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                        'product_id': ["required"]
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
                        } else {
                            let quote = await companies.companies.insurace.getQuote(
                                {
                                    product_id: cover.product_id,
                                    address: cover.address,
                                    amount: req.body.coverAmount,
                                    period: req.body.period,
                                    currency: req.body.currency,
                                    owner_id: req.body.owner_id,
                                    supported_chain: req.body.supported_chain ? req.body.supported_chain : "Ethereum"
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
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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

exports.insuracAceConfirmPremium = async (req, res, next) => {
    let rules = {
        'chain': ['required'],
        'params': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
        } else {

            let response = await companies.companies.insurace.confirmPremium(
                {
                    chain: req.body.chain,
                    params: req.body.params
                })

            res.send(utils.apiResponseData(response.status, response.data))

        }
    });

}

exports.coverDetails = async (req, res, next) => {

    
    let details = {
        reviews: [],
        description: ``,
        additional_details: ``,
        terms_and_conditions: ``,
        pdf: null,
    }

    let findObj = {};
    if (constant.SmartContractTypes.includes(req.params.type)) {
        findObj["policy.product_type"] = constant.ProductTypes.smart_contract;
        details.description = "Smart contract cover ensures that a user’s funds are always protected in the event of a malicious attack/hack causing material loss to a user's staked funds. Depending upon the insurer a smart contract cover shall insure a user’s staked funds against vulnerability/bugs found and exploited by an malicious party, governance attacks, flash loan attacks, oracle manipulations and impermanent loss. It is advised to always view the insurer’s policy document before availing the cover to attain the exact understanding and scope of the cover.";
    } else if (constant.CryptoExchangeTypes.includes(req.params.type)) {
        findObj["policy.product_type"] = constant.ProductTypes.crypto_exchange;
        details.description = "The basis of how a centralized crypto exchange works is that they maintain an off chain ledger of balances to enable pear to pear (P2P) trading. This yields more speed, affordable transaction fees, increased scope of trading meaning coins irrespective of their native blockchains can be traded at one spot. The trade off for this is the off-chain self maintained centralized ledger of the crypto exchange. This ledger has proven to be very susceptible to hacks and attacks. To protect against this vulnerability centralized crypto exchange presents Crypto Exchange covers are devised. It is advised to always view the insurer’s policy document before availing the cover to attain the exact understanding and scope of the cover."
    }

    let unique_id = companies.decodeUniqueId(req.params.unique_id);
    console.log("unique_id ", unique_id);
    if(unique_id && unique_id.company_code && Object.keys(config_companies).includes(unique_id.company_code)){
        if(unique_id.company_code == "nexus"){
            details.additional_details = "Nexus Mutual is a decentralized platform built on blockchain technology that offers insurance products for Ethereum users. Curating +100 active cover products, having an active cover amount of +590M USD with annual premiums in force being +16M USD.";

            if(req.params.type == "protocol"){
                details.terms_and_conditions = "<p>Events covered:</p><ul><li>contract bugs</li><li>economic attacks, including oracle failures</li><li>governance attacks</li></ul><p><br></p><p>Claiming:</p><ul><li>You must provide proof of the incurred loss at claim time.</li><li>You should wait 72 hours after the event, so assessors have all details to make a decision.</li><li>You can claim up to 35 days after the cover period expires, given your cover was active when the incident happened.</li></ul><p>This cover is not a contract of insurance. Cover is provided on a discretionary basis with Nexus Mutual members having the final say on which claims are paid.</p>";
                details.pdf = "https://nexusmutual.io/pages/ProtocolCoverv1.0.pdf";
            }else if(req.params.type == "token"){
                details.terms_and_conditions = "<p>Covered events:</p><ul><li>the yield bearing token de-pegs in value by more than 10%</li></ul><p><br></p><p>Claiming:</p><ul><li>You must wait for the mutual members to confirm and asses the incident.</li><li>You will then be able to send in your covered tokens in return for 90% of their value before the incident, up to the cover amount.</li><li>You can claim up to 14 days after the cover period expires, given your cover was active when the incident happened.</li></ul><p>This cover is not a contract of insurance. Cover is provided on a discretionary basis with Nexus Mutual members having the final say on which claims are paid.</p>";
                details.pdf = "https://nexusmutual.io/pages/YieldTokenCoverv1.0.pdf";
            }else if(req.params.type == "custodian"){
                details.terms_and_conditions = "<p>Covered events:</p><ul><li>the custodian gets hacked and you lose more than 10% of your funds</li><li>withdrawals from the custodian are halted for more than 90 days.</li></ul><p>Claiming:</p><ul><li>You must provide proof of the incurred loss at claim time.</li><li>You should wait 72 hours after the event, so assessors have all details to make a decision.</li><li>You can claim up to 35 days after the cover period expires, given your cover was active when the incident happened.</li></ul><p>You declare that you have funds deposited with the custodian provider you want to buy cover for.</p><p>You declare that you are not the custodian, a representative of the custodian or a related entity or individual to the custodian.</p><p><br></p><p>Custodial services only, including Crypto Earn, Crypto Credit and Exchange. All non-custodial services such as DeFi Wallet, DeFi Earn and DeFi Swap are excluded.</p><p>This cover is not a contract of insurance. Cover is provided on a discretionary basis with Nexus Mutual members having the final say on which claims are paid.</p>";
                details.pdf = "https://nexusmutual.io/pages/CustodyCoverWordingv1.0.pdf";
            }

        }else if(unique_id.company_code == "insurace"){

            if(req.params.type == "protocol"){
                details.pdf = "https://files.insurace.io/public/en/cover/SmartContractCover_v2.0.pdf";
            }else if(req.params.type == "token"){
                details.pdf = "https://files.insurace.io/public/en/cover/USDTDepegCover.pdf";
            }else if(req.params.type == "custodian"){
                details.pdf = "https://files.insurace.io/public/en/cover/CustodianRiskCover.pdf";
            }

            details.additional_details = "InsurAce.io is a decentralized multi-chain insurance protocol that offers portfolio-based insurance products to primarily insure digital assets. Covering 95+ protocols, having an active cover amount of +70M USD and a total value locked of +35M USD.";
        }
    }

    findObj["$or"] = [
        { "policy.SmartContract.unique_id": req.params.unique_id },
        { "policy.CryptoExchange.unique_id": req.params.unique_id }
    ]

    let aggregate = [];

    aggregate.push({
        $lookup: {
            from: Policies.collection.collectionName,
            localField: "policy_id",
            foreignField: "_id",
            as: "policy"
        }
    })
    aggregate.push({ $unwind: { path: "$policy" } });
    aggregate.push({
        $lookup: {
            from: Users.collection.collectionName,
            localField: "user_id",
            foreignField: "_id",
            as: "user"
        }
    })
    aggregate.push({ $unwind: { path: "$user" } });
    aggregate.push({ $match: findObj })
    aggregate.push({ $sort: { _id: -1 } });
    aggregate.push({
        $project: {
            "user.first_name": 1, "user.last_name": 1, "user.email": 1,
            "policy.product_type": 1,
            "policy.SmartContract": 1,
            "policy.CryptoExchange": 1,
            "rating": 1, "review": 1, "updatedAt": 1
        }
    })

    let reviews = await Reviews.aggregate(aggregate);

    if (Array.isArray(reviews)) {
        reviews = reviews.map(review => {
            return {
                rating: review.rating,
                review: review.review,
                updatedAt: review.updatedAt,
                first_name: _.get(review, "user.first_name", ""),
                last_name: _.get(review, "user.last_name", ""),
                email: _.get(review, "user.email", ""),
            }
        })
    }

    details.reviews = reviews;


    // Get Capacity Details
    let cover = {};
    if(unique_id && unique_id.company_code && unique_id.address){
        try {
            console.log(unique_id.company_code, unique_id.address, _.get(unique_id, "product_id", false));
            cover = await companies.coverCapacity(unique_id.company_code, unique_id.address, _.get(unique_id, "product_id", false));
        } catch (error) {
            
        }
    }

    return res.send(utils.apiResponseData(true, {...details, cover}));
}