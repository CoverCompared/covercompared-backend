const utils = require("../../libs/utils");
const _ = require("lodash");
const mongoose = require("mongoose");
const PolicyRequests = mongoose.model('PolicyRequests');
const Policies = mongoose.model('Policies');


exports.index = async (req, res, next) => {
    try {

        let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
        const skip = parseInt(range[0]);
        const limit = parseInt(range[1]) - skip;

        let findObj = {};
        const search = JSON.parse(_.get(req.query, "filter", "{}"));

        if (search) {
            findObj["$and"] = [];
            if (search.email) {
                findObj["$and"].push({ email: { $regex: search.email, $options: "i" } });
            }
            if (search.country) {
                findObj["$and"].push({ country: search.country });
            }
        }


        let total = await PolicyRequests.countDocuments();
        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

        let policy_request = await PolicyRequests.find(findObj)
            .select(["product_type", "country", "email", "createdAt"])
            .populate({
                path: "user_id",
                select: ["first_name", "last_name"]
            })
            .sort({ "_id": -1 })
            .limit(limit)
            .skip(skip).lean();


        let data = {
            range: `${range[0]}-${range[1]}/${total}`,
            policy_request: policy_request
        }

        return res.status(200).send(utils.apiResponseData(true, data));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.show = async (req, res, next) => {

    try {
        let policy_request = await PolicyRequests.find({ _id: req.params.id })
            .select(["product_type", "country", "email", "createdAt"])
            .populate({
                path: "user_id",
                select: ["first_name", "last_name"]
            });

        if (policy_request == "") {
            /**
             * TODO:
             * Error Report
             * If policy_request record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy Request not found."));
        }

        return res.status(200).send(utils.apiResponseData(true, policy_request));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

