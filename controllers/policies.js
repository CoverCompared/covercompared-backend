const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Policies = mongoose.model('Policies');
const niv = require("./../libs/nivValidations");

exports.store = async (req, res, next) => {

    try {

        let rules = {
            "txn_hash": ["required"],
            "block_timestamp": ["required"],
            "partner_id": ["required"],
            "product_id": ["required"],
            "amount_paid": ["required"],
            "currency": ["required"],
            "amount_covered": ["required"],
            "cover_duration": ["required"],
            "txn_type": ["required"],
            "blockchain": ["required"],
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        let policy = new Policies;
        policy.user_id = req.user._id;
        policy.txn_hash = req.body.txn_hash;
        policy.block_timestamp = req.body.block_timestamp;
        policy.partner_id = req.body.partner_id;
        policy.product_id = req.body.product_id;
        policy.amount_paid = req.body.amount_paid;
        policy.currency = req.body.currency;
        policy.amount_covered = req.body.amount_covered;
        policy.cover_duration = req.body.cover_duration;
        policy.txn_type = req.body.txn_type;
        policy.blockchain = req.body.blockchain;
        await policy.save();

        return res.status(200).send(utils.apiResponse(true, "Policy added successfully.", { _id: policy._id }));



    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.get = async (req, res, next) => {
    try {
        let policies = await Policies.find({ user_id: req.user._id });
        return res.status(200).send(utils.apiResponseData(true, policies));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
exports.show = async (req, res, next) => {
    try {
        let policies = await Policies.findOne({ user_id: req.user._id, _id: req.params.id });
        return res.status(200).send(utils.apiResponseData(true, policies));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
exports.update = async (req, res, next) => {
    try {
        let policy = await Policies.findOne({ user_id: req.user._id, _id: req.params.id });

        if(policy){

            let rules = {
                "txn_hash": ["required"],
                "block_timestamp": ["required"],
                "partner_id": ["required"],
                "product_id": ["required"],
                "amount_paid": ["required"],
                "currency": ["required"],
                "amount_covered": ["required"],
                "cover_duration": ["required"],
                "txn_type": ["required"],
                "blockchain": ["required"],
            }
    
            let v = new niv.Validator(req.body, rules);
            let validation = await v.check();
    
            if (!validation) {
                res.status(200).send(utils.apiResponseData(false, v.errors))
                return;
            }
    
            policy.txn_hash = req.body.txn_hash;
            policy.block_timestamp = req.body.block_timestamp;
            policy.partner_id = req.body.partner_id;
            policy.product_id = req.body.product_id;
            policy.amount_paid = req.body.amount_paid;
            policy.currency = req.body.currency;
            policy.amount_covered = req.body.amount_covered;
            policy.cover_duration = req.body.cover_duration;
            policy.txn_type = req.body.txn_type;
            policy.blockchain = req.body.blockchain;
            await policy.save();
    
            return res.status(200).send(utils.apiResponse(true, "Policy updated successfully."));
            return res.status(200).send(utils.apiResponseData(true, policies));
        }else{
            return res.status(200).send(utils.apiResponseMessage(true, "Policy not found."));
        }

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.delete = async (req, res, next) => {
    try {
        await Policies.findOneAndDelete({ user_id: req.user._id, _id: req.params.id });
        return res.status(200).send(utils.apiResponseMessage(true, "Policy deleted successfully."));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}