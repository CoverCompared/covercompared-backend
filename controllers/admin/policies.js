const utils = require("../../libs/utils");
const _ = require("lodash");
const { Parser } = require('json2csv');
const moment = require('moment');

const mongoose = require("mongoose");
const constant = require("../../libs/constants");
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');
const Payments = mongoose.model('Payments');
const Reviews = mongoose.model('Reviews');

exports.index = async (req, res) => {
    try {
        let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
        const skip = parseInt(range[0]);
        const limit = parseInt(range[1]) - skip;

        let findObj = {};
        const search = JSON.parse(_.get(req.query, "filter", "{}"));

        if(
            req.query.export == "csv" &&
            (!search.from_date || !search.to_date) 
        ){
            delete req.query.export;
        }

        if (search) {
            findObj["$and"] = [];
            if (search.txn_hash) {
                findObj["$and"].push({ txn_hash: { $regex: search.txn_hash, $options: "i" } });
            }
            if (search.status) {
                findObj["$and"].push({ status: search.status });
            }
            if (search.product_type) {
                findObj["$and"].push({ product_type: { $regex: search.product_type, $options: "i" } });
            }
            if (search.from_date || search.to_date) {
                let createdAt = {};
                if(search.from_date){
                    createdAt["$gte"] = new Date(`${moment(search.from_date).format('YYYY-MM-DD')}T00:00:00.000Z`)
                }
                if(search.to_date){
                    createdAt["$lte"] = new Date(`${moment(search.to_date).format('YYYY-MM-DD')}T23:59:59.000Z`)
                }
                findObj["$and"].push({ createdAt: createdAt });
            }
            if (search.q) {
                findObj["$or"] = [
                    { "txn_hash": { $regex: search.q, $options: "i" } },
                    { "user.email": { $regex: search.q, $options: "i" } }
                ];
            }
        }

        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

        let aggregate = [];
        aggregate.push({
            $lookup: {
                from: Users.collection.collectionName,
                localField: "user_id",
                foreignField: "_id",
                as: 'user'
            }
        });
        aggregate.push({ $unwind: { path: "$user" } });
        aggregate.push({
            $project: {
                "txn_hash": 1, "product_type": 1, "status": 1, "payment_status": 1,
                "total_amount": 1, "user_id": 1,
                "currency": 1,
                "createdAt": 1,
                "crypto_currency": 1,
                "crypto_amount": 1,
                "user.first_name": 1, "user.last_name": 1, "user.email": 1
            }
        });
        aggregate.push({ $match: findObj })


        let total = await Policies.aggregate([...aggregate, { $count: "total" }]);

        aggregate.push({ $sort: { _id: -1 } })
        aggregate.push({ $skip: skip })
        aggregate.push({ $limit: limit })

        let policy = await Policies.aggregate(aggregate);

        let data = {
            range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
            data: policy
        }

        if(req.query.export == "csv"){
            let data = [];
            if(Array.isArray(policy) && policy.length){
                data = policy.map(value => {
                    let val = {
                        product_type: value.product_type ? _.get(constant.ProductTypesName, value.product_type, "")  : "",
                        txn_hash: value.txn_hash ? value.txn_hash : "",
                        name: `${_.get(value, "user.first_name", false) ? value.user.first_name : ""} ${_.get(value, "user.last_name", false) ? value.user.last_name : ""}`,
                        email:_.get(value, "user.email", false) ? value.user.email : "",
                        status:_.capitalize(value.status),
                        payment_status: _.capitalize(value.payment_status),
                        date : utils.getFormattedDate(value.createdAt)
                    };
                    
                    if([constant.ProductTypes.device_insurance, constant.ProductTypes.mso_policy].includes(value.product_type)){
                        val.total_amount = `${value.total_amount ? value.total_amount : ""} ${value.currency ?  value.currency : ""}`    
                    }
                    if([constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange].includes(value.product_type)){
                        val.total_amount = `${value.crypto_amount ? value.crypto_amount : ""} ${value.crypto_currency ?  value.crypto_currency : ""}`    
                    }
                    return val;
                });
            }

            const fields = [
                { label: "Product Type", value: "product_type" },
                { label: "Txn Hash", value: "txn_hash" },
                { label: "Name", value: "name" },
                { label: "Email", value: "email" },
                { label: "Status", value: "status" },
                { label: "Payment Status", value: "payment_status" },
                { label: "Total Amount", value: "total_amount" },
                { label: "Date", value: "date" },
            ];
            const json2csv = new Parser({ fields });
            const csv = json2csv.parse(data);
            res.header('Content-Type', 'text/csv');

            let product_type_name = search.product_type ? constant.ProductTypes[search.product_type] : "";
            let from_date = search.from_date ? `-${utils.getFormattedDate(search.from_date)}` : "";
            let to_date = search.to_date ? `-${utils.getFormattedDate(search.to_date)}` : "";
            res.attachment(`Cover Compared Policies${from_date}${to_date}${product_type_name}.csv`);

            return res.send(csv);
        }else{
            return res.status(200).send(utils.apiResponseData(true, data));
        }

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.show = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({ _id: req.params.id })
            .populate({
                path: "user_id",
                select: ["first_name", "last_name", "email"],
                model: Users
            }).populate({
                path: "payment_id",
                model: Payments
            })
            .lean();

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let reviews = await Reviews.findOne({ policy_id: req.params.id })
            .select(["rating", "review", "updatedAt"])
            .lean();

        let user = policy.user_id;
        let payment = policy.payment_id;
        policy = await Policies.getPolicies(policy.product_type, { _id: req.params.id });

        return res.status(200).send(utils.apiResponseData(true, { ...policy[0], reviews, user, payment }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.destroy = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({ _id: req.params.id })
            .populate({
                path: "user_id",
                select: ["first_name", "last_name", "email"],
                model: Users
            }).populate({
                path: "payment_id",
                model: Payments
            })
            .lean();

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        await Policies.findOneAndDelete({ _id: req.params.id });
        return res.status(200).send(utils.apiResponseMessage(true, "Policy deleted successfully."));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
