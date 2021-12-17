const nexus = require("./nexus");
const nsure = require("./nsure");
const insurace = require("./insurace");
const unore = require("./unore");
const _ = require("lodash");
const NodeCache = require("node-cache");
const config = require("../../config");
const utils = require("../utils");
const myCache = new NodeCache();


exports.companies = {
    nexus,
    nsure,
    insurace,
    unore
}

/**
 * 
 * @param {Object} options 
 * @param {string} options.search 
 * @param {Array} options.companies 
 * @param {string} options.type 
 * @param {Array} options.supported_chains
 * @param {Array} options.currency
 * @param {Number|boolean} options.duration_min_day
 * @param {Number|boolean} options.duration_max_day
 * @param {Number|boolean} options.amount_min
 * @param {Number|boolean} options.amount_max
 * @returns 
 */
exports.coverList = async (options = {}) => {


    let companies = Object.values(this.companies)
    companies = companies.filter((company) => { return company.company.status; });

    if (options.companies.length) {
        companies = companies.filter(company => {
            return options.companies.includes(company.code);
        })
    }

    let coverList;

    let list = [];
    let supported_chain_option = [];
    let type_option = [];
    for (const key in companies) {
        coverList = await utils.getCompanyCoverList(companies[key]);

        coverList.map(cover => {

            if (!type_option.includes(cover.type)) {
                type_option.push(cover.type)
            }

            if (cover.supportedChains.length) {
                cover.supportedChains.map(chain => {
                    if (!supported_chain_option.includes(chain)) {
                        supported_chain_option.push(chain)
                    }
                })
            }
        })

        list = [...list, ...coverList];

    }
    list = await list.filter((object) => {
        if (object.type == "protocol" && !_.get(object, "supportedChains", []).length) {
            console.log("// Send Error Report - Supported Chain Not found")
            return false;
        } else if (object.type == "protocol" && !_.get(object, "currency", []).length) {
            console.log("// Send Error Report - Currency Not found")
            return false;
        } else {
            return true;
        }
    })

    if (options.duration_min_day) {
        list = await list.filter((object) => {
            return object.duration_days_min <= options.duration_min_day && object.duration_days_min <= object.duration_days_max
        })
        list = await list.map((object) => {
            object.duration_days_min = options.duration_min_day
            return object;
        })
    }
    if (options.duration_max_day) {
        list = await list.filter((object) => {
            return options.duration_max_day >= object.duration_days_min
            // return object.duration_days_max <= options.duration_max_day
        })
    }

    if (options.amount_min) {
        list = await list.map((object) => {
            let currency = [];
            let currency_limit = {};
            if (object.currency_limit) {
                for (const key in object.currency_limit) {
                    if (
                        _.get(object.currency_limit, `${key}.min`, false) !== false && (options.amount_min >= object.currency_limit[key].min) &&
                        (object.currency_limit[key].max == undefined || (options.amount_min <= object.currency_limit[key].max))
                    ) {
                        currency.push(key);
                        currency_limit[key] = object.currency_limit[key];
                    }
                }
            }
            object.currency = currency;
            object.currency_limit = currency_limit;
            return object;
        })
        list = await list.filter((object) => {
            return (object.currency.length) ? true : false;
        })
    }
    if (options.amount_max) {
        list = await list.map((object) => {
            let currency = [];
            let currency_limit = {};
            if (object.currency_limit) {
                for (const key in object.currency_limit) {
                    if (
                        _.get(object.currency_limit, `${key}.min`, false) !== false && (options.amount_max >= object.currency_limit[key].min) 
                        // && (object.currency_limit[key].max == undefined || (object.currency_limit[key].max <= options.amount_max))
                    ) {
                        currency.push(key);
                        currency_limit[key] = object.currency_limit[key];
                    }
                }
            }
            object.currency = currency;
            object.currency_limit = currency_limit;
            return object;
        })
        list = await list.filter((object) => {
            return (object.currency.length) ? true : false;
        })
    }

    if (Array.isArray(options.type) && options.type.length) {
        list = await list.filter((object) => {
            return options.type.includes(object.type)
        })
    }
    if (Array.isArray(options.supported_chains) && options.supported_chains.length) {
        list = await list.filter((object) => {
            return _.get(object, "supportedChains", []).some(value => options.supported_chains.includes(value));
        })
    }
    if (Array.isArray(options.currency) && options.currency.length) {
        list = await list.filter((object) => {
            return _.get(object, "currency", []).some(value => options.currency.includes(value));
        })
    }

    if (options.search !== false) {
        list = await list.filter((object) => {
            return new RegExp(options.search, "gi").test(object.name) || new RegExp(options.search, "gi").test(object.address)
        })
    }

    list = _.sortBy(list, "name")

    return { list, supported_chain_option, type_option };

}

exports.coverListOptions = async () => {

    let companies = Object.values(this.companies)
    companies = companies.filter((company) => { return company.company.status; });

    let coverList;

    let supported_chain_option = [];
    let type_option = [];
    let currency_option = [];
    let duration_days_option = {
        min: undefined,
        max: undefined
    }
    let amount_option = {
        min: undefined,
        max: undefined
    }
    for (const key in companies) {
        coverList = await utils.getCompanyCoverList(companies[key]);

        coverList.map(cover => {

            if (!type_option.includes(cover.type)) {
                type_option.push(cover.type)
            }

            if (Array.isArray(cover.supportedChains) && cover.supportedChains.length) {
                cover.supportedChains.map(chain => {
                    if (!supported_chain_option.includes(chain)) {
                        supported_chain_option.push(chain)
                    }
                })
            }
            if (Array.isArray(cover.currency) && cover.currency.length) {
                cover.currency.map(value => {
                    if (!currency_option.includes(value)) {
                        currency_option.push(value)
                    }
                })
            }

            if (_.get(cover, "duration_days_min", false) !== false && (duration_days_option.min == undefined || cover.duration_days_min < duration_days_option.min)) {
                duration_days_option.min = cover.duration_days_min
            }
            if (_.get(cover, "duration_days_max", false) !== false && (duration_days_option.max == undefined || cover.duration_days_max > duration_days_option.max)) {
                duration_days_option.max = cover.duration_days_max
            }

            if (cover.currency_limit) {
                for (const key in cover.currency_limit) {
                    if (
                        _.get(cover.currency_limit, `${key}.min`, false) !== false
                        && cover.currency_limit[key].min != undefined
                        && (amount_option.min == undefined || cover.currency_limit[key].min < amount_option.min)
                    ) {
                        amount_option.min = cover.currency_limit[key].min
                    }

                    if (
                        _.get(cover.currency_limit, `${key}.max`, false) !== false
                        && cover.currency_limit[key].max != undefined
                        && (amount_option.max == undefined || cover.currency_limit[key].max > amount_option.max)
                    ) {
                        amount_option.max = cover.currency_limit[key].max
                    }
                }
            }


        })

    }

    return { supported_chain_option, type_option, duration_days_option, currency_option, amount_option };

}

// exports.getCompanyCoverList = async (company) => {
//     coverList = myCache.get(`${company.code}CoverList`);
//     if (coverList == undefined) {
//         coverList = await company.coverList()
//         myCache.set(`${company.code}CoverList`, coverList, config.cache_time)
//     }
//     return coverList;
// }

/**
 * 
 * @param {string} company_code 
 * @param {string} address 
 */
exports.coverCapacity = async (company_code, address, product_id = null) => {

    let companies = [
        nexus,
        nsure,
        insurace
    ]

    let company = companies.find(value => value.code == company_code)

    if (company) {
        coverList = await utils.getCompanyCoverList(company);

        cover = coverList.find(e => {
            return e.address == address && (!e.product_id || (e.product_id && e.product_id == product_id))
        })

        if (cover) {
            if (!cover.capacity && company.code == nexus.code) {
                capacity_key = `${company.code}CoverList.capacity.${address}${product_id}`
                capacity = myCache.get(capacity_key);
                if (capacity == undefined) {
                    capacity = await company.getCapacity(cover.address);
                    myCache.set(capacity_key, capacity, config.cache_time)
                }

                cover.capacity = capacity;
            }
            return cover;
        }

    }
    return false;


}

exports.getQuote = async ({ company_code, address, amount, period, supported_chain = "Ethereum", currency = 'ETH', product_id = null }) => {

    let cacheKey = `quote-${company_code}-${address}-${amount}-${period}-${supported_chain}-${currency}-${product_id}`;
    quote = myCache.get(cacheKey);
    if (quote == undefined) {
        if (company_code == this.companies.nexus.code && this.companies.nexus.company.status) {
            quote = await this.companies.nexus.getQuote(address, amount, currency, period);
        } else if (company_code == this.companies.insurace.code && this.companies.insurace.company.status) {
            quote = await this.companies.insurace.getQuote({
                supported_chain: supported_chain,
                product_id: product_id,
                address: address,
                amount: amount,
                period: period,
                currency: currency
            })

        } else if (company_code == this.companies.nsure.code && this.companies.nsure.company.status) {
            quote = await this.companies.nsure.getQuote(product_id, utils.convertToCurrency(amount, 18), period)
        } else if (company_code == this.companies.unore.code && this.companies.unore.company.status) {
            quote = await this.companies.unore.getQuote(product_id, utils.convertToCurrency(amount, 18), period)
        }
        if (quote.status == false) {
            quote.data = quote.data.toString()
        }
        myCache.set(cacheKey, quote, config.cache_time)
    }

    if (company_code == this.companies.nexus.code && this.companies.nexus.company.status) {
        if (quote.status == true) {
            quote = _.get(quote, "data.price", false);
            if (quote !== false) {
                quote = quote / (10 ** 18);
            }
        } else {
            quote = false
        }
    } else if (company_code == this.companies.insurace.code && this.companies.insurace.company.status) {
        if (quote.status == true) {
            quote = _.get(quote, "data.premiumAmount", false);
            if (quote !== false) {
                quote = quote / (10 ** 18);
            }
        } else {
            quote = false
        }

    } else if (company_code == this.companies.nsure.code && this.companies.nsure.company.status) {
        if (quote.status == true) {
            quote = _.get(quote, "data.list", false);
        } else {
            quote = false
        }
    } else if (company_code == this.companies.unore.code && this.companies.unore.company.status) {
        if (quote.status == true) {
            quote = _.get(quote, "data.list", false);
        } else {
            quote = false
        }
    }
    return quote;

}

exports.getCoverImage = async (unique_id) => {
    if (typeof unique_id === "string") {
        let company_code = unique_id.split(".");
        company_code = company_code[company_code.length - 1]
        console.log("Company Code", company_code);
        switch (company_code) {
            case this.companies.nexus.code:
                return await this.companies.nexus.getCoverImage(unique_id);
                break;
            case this.companies.insurace.code:
                return await this.companies.insurace.getCoverImage(unique_id);
                break;
            case this.companies.nsure.code:
                return await this.companies.nsure.getCoverImage(unique_id);
                break;
            case this.companies.unore.code:
                return await this.companies.unore.getCoverImage(unique_id);
                break;
            default:
                break;
        }
    }
    return `${config.api_url}images/smart-contract-default.png`
}

exports.getCompanyCodes = () => {
    return _.map(_.filter(Object.values(this.companies), "company.status"), "code");
}