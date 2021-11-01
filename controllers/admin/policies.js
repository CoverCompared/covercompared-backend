const utils = require("../../libs/utils");
const _ = require("lodash");
const mongoose = require("mongoose");
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');
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
        }



        let total = await Policies.countDocuments();
        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }



        let policy = await Policies.find(findObj)
            // .load(criteria)
            .select(["txn_hash", "product_type", "status", "user_id"].join(" "))
            .populate({
                path: "user_id",
                model: Users,
                select: [
                    "first_name", "last_name", "email"
                ],
            })
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip).lean();


        // let user_detail = await Users.find({ _id:policy.user_id}) 
        // console.log(user_detail);

        let data = {
            range: `${range[0]}-${range[1]}/${total}`,
            policy: policy
        }
        // console.log(data.policy.user_id);

        return res.status(200).send(utils.apiResponseData(true, data));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.show = async (req, res, next) => {
    try {
        let policy = await Policies.findOne({ _id: req.params.id });
        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let reviews = await Reviews.find({ policy_id: req.params.id })
            .select(["rating", "review", "updatedAt"])
            .lean();
            
        policy = await Policies.getPolicies(policy.product_type, { _id: req.params.id });

        return res.status(200).send(utils.apiResponseData(true, { ...policy[0], reviews }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
