const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Users = mongoose.model('Users');
const Reviews = mongoose.model('Reviews');
const Policies = mongoose.model('Policies');
const MSOPolicies = mongoose.model('MSOPolicies');
const DeviceInsurance = mongoose.model('DeviceInsurance');
const niv = require("./../libs/nivValidations");
const mailer = require("../libs/mailer");
const constant = require('../libs/constants');
const moment = require("moment");
const { request } = require("express");

exports.get = async (req, res, next) => {

    try {
        let find = {};
        let aggregates = [];
        if (req.query.product_type) {
            find["policy.product_type"] = req.query.product_type;
            aggregates.push({ $unwind: { path: `$${req.query.product_type}` } })

            if (req.query.product_type == constant.ProductTypes.mso_policy && req.query.plan_type) {
                find["mso_policy.plan_type"] = req.query.plan_type;
            }
        }

        let reviews = await Reviews.aggregate([{
            $lookup: {
                from: Policies.collection.collectionName,
                localField: 'policy_id',
                foreignField: '_id',
                as: 'policy'
            }
        }, { $unwind: { path: "$policy" } }, {
            $lookup: {
                from: MSOPolicies.collection.collectionName,
                localField: "policy.reference_id",
                foreignField: "_id",
                as: "mso_policy"
            }
        }, {
            $lookup: {
                from: DeviceInsurance.collection.collectionName,
                localField: "policy.reference_id",
                foreignField: "_id",
                as: "device_insurance"
            }
        }, {
            $lookup: {
                from: Users.collection.collectionName,
                localField: "user_id",
                foreignField: "_id",
                as: "user"
            }
        },
        { $match: find },
        ...aggregates,
        {
            $project: {
                "user.first_name": 1, "user.last_name": 1, "user.email": 1,
                "policy.product_type": 1,
                "rating": 1, "review": 1, "updatedAt": 1,
                "mso_policy": 1, "device_insurance": 1
            }
        }]);

        if (Array.isArray(reviews) && reviews.length) {
            reviews = reviews.map((review) => {
                let detail_index = req.query.product_type ? "" : ".0" ;
                if (review.policy.product_type == constant.ProductTypes.mso_policy) {
                    review.mso_policy = {
                        plan_type: _.get(review, `mso_policy${detail_index}.plan_type`, "")
                    }
                } else {
                    delete review.mso_policy;
                }

                if (review.policy.product_type == constant.ProductTypes.device_insurance) {
                    review.device_insurance = {
                        device_type: _.get(review, `device_insurance${detail_index}.device_type`, ""),
                        brand: _.get(review, `device_insurance${detail_index}.brand`, "")
                    }
                } else {
                    delete review.device_insurance;
                }

                return review;
            })
        }

        return res.status(200).send(utils.apiResponseData(true, reviews));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
