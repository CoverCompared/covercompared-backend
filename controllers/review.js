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


exports.getss = async (req, res, next) => {

    var product_type = req.query.product_type;
    var find = { product_type: product_type };

    const Policies = mongoose.model("Policies");
    let policies = [];

    if (
        product_type == "mso_policy" ||
        (Array.isArray(product_type) && product_type.includes("mso_policy"))
    ) {
        const MSOPolicies = mongoose.model("MSOPolicies");
        let mso_policies = await Policies.find({ ...find, product_type: constant.ProductTypes.mso_policy })
            .select(["-StatusHistory", "-PaymentStatusHistory", "-user_id", "-payment_id"]).sort({ _id: -1 }).populate({
                path: "reference_id",
                select: [
                    "_id", "plan_type", "quote", "name", "country",
                    "mso_cover_user", "currency", "policy_price", "mso_addon_service",
                    "MSOMembers"
                ],
                model: MSOPolicies
            }).lean();

        policies = [...policies, ...mso_policies];

    }

    if (
        product_type == "device_insurance" ||
        (Array.isArray(product_type) && product_type.includes("device_insurance"))
    ) {
        const DeviceInsurance = mongoose.model("DeviceInsurance");
        let device_insurances = await Policies.find({ ...find, product_type: constant.ProductTypes.device_insurance })
            .select(["-StatusHistory", "-PaymentStatusHistory", "-user_id", "-payment_id"]).sort({ _id: -1 }).populate({
                path: "reference_id",
                select: [
                    "_id", "device_type", "brand", "value", "purchase_month", "model",
                    "plan_type", "first_name", "last_name", "email", "phone", "currency",
                    "amount", "discount_amount", "tax", "total_amount", "payment_hash",
                ],
                model: DeviceInsurance
            }).lean();

        policies = [...policies, ...device_insurances];
    }

    policies = policies.map(policy => {
        policy.details = policy.reference_id;
        delete policy.reference_id;
        return policy;
    })
    return policies;
}

