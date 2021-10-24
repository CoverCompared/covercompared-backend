const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const PolicyRequests = mongoose.model('PolicyRequests');
const Users = mongoose.model('Users');
const niv = require("./../libs/nivValidations");
const constant = require("../libs/constants");

exports.store = async (req, res, next) => {

    try {
        let rules = {
            "product_type": ["required", `in:${Object.values(constant.ProductTypes).join(",")}`],
            "country": ["required"],
            "email": ["required", "email"],
            "user_id": ["nullable", "ObjectId"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        let policy_request = new PolicyRequests;
        policy_request.user_id = req.body.user_id;
        policy_request.product_type = req.body.product_type;
        policy_request.country = req.body.country;
        policy_request.email = req.body.email;
        await policy_request.save();

        return res.status(200).send(utils.apiResponse(true, "Policy Request added successfully."));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}


exports.show = async (req, res, next) => {
    try {
        
        let policy_request = await PolicyRequests.find();
        
        return res.status(200).send(utils.apiResponseData(true, policy_request));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}


exports.view = async (req, res, next) => {
    try {
        let user = await Users.findOne({ _id: req.params.id });
        if (!user) {
            /**
             * TODO:
             * Error Report
             * If user or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "User not found."));
        }

        let policy_request = await PolicyRequests.find({ user_id: req.params.id });
        return res.status(200).send(utils.apiResponseData(true, policy_request));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}