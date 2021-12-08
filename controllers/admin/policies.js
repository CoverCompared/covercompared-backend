const utils = require("../../libs/utils");
const _ = require("lodash");
const mongoose = require("mongoose");
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
                "user.first_name": 1, "user.last_name": 1, "user.email": 1
            }
        });
        aggregate.push({ $match: findObj })


        let total = await Policies.aggregate([...aggregate, {$count: "total"}]);

        aggregate.push({ $sort: { _id: -1 } })
        aggregate.push({ $skip: skip })
        aggregate.push({ $limit: limit })

        let policy = await Policies.aggregate(aggregate);

        let data = {
            range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
            data: policy
        }

        return res.status(200).send(utils.apiResponseData(true, data));
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
