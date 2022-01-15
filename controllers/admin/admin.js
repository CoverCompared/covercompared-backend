const companies = require("../../config/companies");
const utils = require("../../libs/utils");

const mongoose = require('mongoose');
const constant = require("../../libs/constants");
const Policies = mongoose.model('Policies');

exports.constants = (req, res) => {

    let COMPANY_NAMES = {};
    for (const key in companies) {
        COMPANY_NAMES[key] = {
            name: companies[key].name,
            code: companies[key].code,
            icon: companies[key].icon,
        }
    }

    res.status(200).send(utils.apiResponseData(true, { COMPANY_NAMES }))
}

exports.dashboard = async (req, res) => {

    let product_types = constant.ProductTypes;

    let counts = {};
    let total_count = 0;
    let cover_counts = {};
    let total = 0;
    for (const key in product_types) {
        cover_counts = await Policies.aggregate([
            { "$match": { product_type: key } },
            { "$group": { _id: "$status", count: { $sum: 1 } } }
        ]);

        counts[key] = {
            total :0,
            pending: 0,
            active: 0,
            cancelled: 0,
            complete: 0
        }
        total = 0;
        
        if(Array.isArray(cover_counts) && cover_counts.length){
            cover_counts.forEach((val) => {
                total += val.count;
                counts[key][val._id] = val.count
            })
        }
        counts[key].total = total;
        total_count += total
    }



    res.status(200).send(utils.apiResponseData(true, {total_count, counts}));
}