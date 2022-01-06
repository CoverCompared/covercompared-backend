const niv = require("./../../libs/nivValidations");
const utils = require("../../libs/utils");
const _ = require("lodash");

const mongoose = require('mongoose');
const Subscriptions = mongoose.model('Subscriptions');


exports.table = async (req, res, next) => {

    let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
    const sort = JSON.parse(_.get(req.query, "sort", '["_id", "desc"]'));
    const skip = parseInt(range[0]);
    const limit = parseInt(range[1]) - skip;
    let findObj = {};
    const search = JSON.parse(_.get(req.query, "filter", "{}"));

    if (search) {
        findObj["$and"] = [];
        if (search.email) {
            findObj["$and"].push({ email: { $regex: search.email, $options: "i" } });
        }

        if(search.q){
            findObj["$or"] = [
                { email: { $regex: search.q, $options: "i" } },
                { name: {$regex: search.q, $options: "i"} }
            ]
        }
    }

    if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

    if (sort[0] == "id") { sort[0] = "_id" }

    let total = await Subscriptions.aggregate([{ $match: findObj }, { $count: 'total' }]);
    let subscription_list = await Subscriptions.find(findObj)
        .sort({ [sort[0]]: sort[1] })
        .limit(limit)
        .skip(skip).lean();

    res.send(utils.apiResponseData(true, {
        range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
        data: subscription_list
    }))

}

