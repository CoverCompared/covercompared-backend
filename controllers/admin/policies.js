const utils = require("../../libs/utils");
const _ = require("lodash");
const mongoose = require("mongoose");
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');



exports.policyList = async (req, res) => {
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
        }

        
    
        let total = await Policies.countDocuments({status: "pending"});
        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }


        const criteria = { product_type: "device_insurance" };
        let policy = await Policies.find(findObj,{status: "pending",product_type: req.params.product_type})
            // .load(criteria)
            .select(["txn_hash","product_type", "status","user_id"].join(" "))
            .limit(limit)
            .skip(skip).lean();

        // console.log(policy.txn_hash);
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

exports.viewPolicy = async (req, res, next) => {

    try {
        let policy = await Policies.find({ _id: req.params.id });
        console.log(policy.txn_hash);
        
        if (policy == "") {
            /**
             * TODO:
             * Error Report
             * If policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy Request not found."));
        }

        return res.status(200).send(utils.apiResponseData(true, policy));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
