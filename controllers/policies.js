const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Policies = mongoose.model('Policies');
const MSOPolicies = mongoose.model('MSOPolicies');
const DeviceInsurance = mongoose.model('DeviceInsurance');
const Reviews = mongoose.model('Reviews');
const Payments = mongoose.model("Payments");
const niv = require("./../libs/nivValidations");
const constant = require("../libs/constants");
const moment = require('moment');

exports.storeMso = async (req, res, next) => {
    try {
        let rules = {
            "plan_type": ["required", "in:BASIC_PLAN,SILVER_PLAN,GOLD_PLAN,PLATINUM_PLAN"],
            "country": ["required"],
            "quote": ["required"],
            "name": ["required"],
            "mso_cover_user": ["nullable"],
            "currency": ["required"],
            "quote": ["required", "numeric"],
            "mso_addon_service": ["required", "numeric"],
            "amount": ["required", "numeric"],
            "discount_amount": ["required", "numeric"],
            "tax": ["required", "numeric"],
            "total_amount": ["required", "numeric"],
            "MSOMembers": ["required", "array"],
            "MSOMembers.*.user_type": ["required"],
            "MSOMembers.*.first_name": ["required"],
            "MSOMembers.*.last_name": ["required"],
            "MSOMembers.*.country": ["required"],
            "MSOMembers.*.dob": ["required", "dateFormat:DD-MM-YYYY"],
            "MSOMembers.*.identity_type": ["nullable"],
            "MSOMembers.*.identity": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        if (utils.getFormattedAmount(parseFloat(req.body.amount)) != utils.getFormattedAmount(parseFloat(req.body.quote) + parseFloat(req.body.mso_addon_service))) {
            return res.status(200).send(utils.apiResponseMessage(false, "Amount does not match of Quote and Addon Service"));
        }

        if (utils.getFormattedAmount(parseFloat(req.body.total_amount)) != utils.getFormattedAmount((parseFloat(req.body.amount) - parseFloat(req.body.discount_amount)) + parseFloat(req.body.tax))) {
            return res.status(200).send(utils.apiResponseMessage(false, "Total Amount is invalid."));
        }

        let policy = new Policies;
        policy.user_id = req.user._id;
        policy.product_type = constant.ProductTypes.mso_policy;
        policy.status = constant.PolicyStatus.pending;
        policy.StatusHistory.push({
            status: policy.status,
            updated_at: new Date(moment()),
            updated_by: req.user._id
        });
        policy.payment_status = constant.PolicyPaymentStatus.unpaid;
        policy.currency = req.body.currency;
        policy.amount = req.body.amount;
        policy.discount_amount = req.body.discount_amount;
        policy.tax = req.body.tax;
        policy.total_amount = req.body.total_amount;
        await policy.save();

        let mso_policy = new MSOPolicies;
        mso_policy.user_id = req.user._id;
        mso_policy.txn_hash = policy.txn_hash;
        mso_policy.policy_id = policy._id;
        mso_policy.plan_type = req.body.plan_type;
        mso_policy.country = req.body.country;
        mso_policy.quote = req.body.quote;
        mso_policy.name = req.body.name;
        mso_policy.mso_cover_user = req.body.mso_cover_user;
        mso_policy.currency = req.body.currency;
        mso_policy.policy_price = req.body.quote;
        mso_policy.mso_addon_service = req.body.mso_addon_service;
        mso_policy.amount = req.body.amount;
        mso_policy.discount_amount = req.body.discount_amount;
        mso_policy.tax = req.body.tax;
        mso_policy.total_amount = req.body.total_amount;
        mso_policy.status = policy.status;

        for (const key in req.body.MSOMembers) {
            mso_policy.MSOMembers.push({
                user_type: req.body.MSOMembers[key].user_type,
                first_name: req.body.MSOMembers[key].first_name,
                last_name: req.body.MSOMembers[key].last_name,
                country: req.body.MSOMembers[key].country,
                dob: new Date(moment(req.body.MSOMembers[key].dob, "DD-MM-YYYY")),
                identity_type: req.body.MSOMembers[key].identity_type,
                identity: req.body.MSOMembers[key].identity
            })
        }

        mso_policy.status = policy.status;
        await mso_policy.save();

        policy.reference_id = mso_policy._id;
        policy.save();

        return res.status(200).send(utils.apiResponse(true, "Policy added successfully.", {
            _id: policy._id,
            txn_hash: policy.txn_hash
        }));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.msoConfirmPayment = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({
            user_id: req.user._id,
            _id: req.params.id,
            product_type: constant.ProductTypes.mso_policy
        });

        let mso_policy = await MSOPolicies.findOne({
            _id: policy.reference_id
        });

        if (!policy || !mso_policy) {
            /**
             * TODO:
             * Error Report
             * If policy or mso_policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let rules = {
            "payment_status": ["required", "in:paid,cancelled"],
            "blockchain": ["required"],
            "wallet_address": ["required"],
            "block_timestamp": ["required"],
            "txn_type": ["required"],
            "payment_hash": ["required"],
            "currency": ["required"],
            "paid_amount": ["required", "numeric"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            return res.status(200).send(utils.apiResponseData(false, v.errors));
        }

        /**
         * TODO:
         * Error Report
         * if req.body.paid_amount does not match with policy.total_amount
         */

        // Create Payment
        let payment = new Payments;
        payment.payment_status = req.body.payment_status;
        payment.blockchain = req.body.blockchain;
        payment.wallet_address = req.body.wallet_address;
        payment.block_timestamp = req.body.block_timestamp;
        payment.txn_type = req.body.txn_type;
        payment.payment_hash = req.body.payment_hash;
        payment.currency = req.body.currency;
        payment.paid_amount = req.body.paid_amount;
        await payment.save();

        // Update payment to Policies
        policy.payment_status = req.body.payment_status;
        policy.PaymentStatusHistory.push({
            status: req.body.payment_status,
            updated_at: new Date(moment())
        });
        policy.payment_id = payment._id;
        policy.blockchain = req.body.blockchain;
        policy.wallet_address = req.body.wallet_address;
        policy.block_timestamp = req.body.block_timestamp;
        policy.txn_type = req.body.txn_type;
        policy.payment_hash = req.body.payment_hash;
        policy.currency = req.body.currency;

        if (policy.payment_status == constant.PolicyPaymentStatus.paid) {
            policy.status = constant.PolicyStatus.active;
            policy.StatusHistory.push({
                status: policy.status,
                updated_at: new Date(moment()),
                updated_by: req.user._id
            });

            // Update payment to MSO Policies
            mso_policy.status = policy.status;
            await mso_policy.save();
        }

        await policy.save();

        return res.status(200).send(utils.apiResponse(true, "Payment detail updated successfully.", {
            policy_id: policy._id,
            txn_hash: policy.txn_hash,
            payment_status: policy.payment_status,
            status: policy.status
        }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.storeDeviceInsurance = async (req, res, next) => {
    try {
        let rules = {
            "device_type": ["required"],
            "brand": ["required"],
            "value": ["required"],
            "purchase_month": ["required"],
            "model": ["required"],
            "plan_type": ["required", "in:monthly,yearly"],
            "first_name": ["required"],
            "last_name": ["required"],
            "email": ["required", "email"],
            "phone": ["required"],
            "currency": ["required"],
            "amount": ["required", "numeric"],
            "discount_amount": ["required", "numeric"],
            "tax": ["required", "numeric"],
            "total_amount": ["required", "numeric"],
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        if (utils.getFormattedAmount(parseFloat(req.body.total_amount)) != utils.getFormattedAmount((parseFloat(req.body.amount) - parseFloat(req.body.discount_amount)) + parseFloat(req.body.tax))) {
            return res.status(200).send(utils.apiResponseMessage(false, "Total Amount is invalid."));
        }

        let policy = new Policies;
        policy.user_id = req.user._id;
        policy.product_type = constant.ProductTypes.device_insurance;
        policy.status = constant.PolicyStatus.pending;
        policy.StatusHistory.push({
            status: policy.status,
            updated_at: new Date(moment()),
            updated_by: req.user._id
        });
        policy.payment_status = constant.PolicyPaymentStatus.unpaid;
        policy.currency = req.body.currency;
        policy.amount = req.body.amount;
        policy.discount_amount = req.body.discount_amount;
        policy.tax = req.body.tax;
        policy.total_amount = req.body.total_amount;
        await policy.save();

        let device_insurance = new DeviceInsurance;
        device_insurance.user_id = req.user._id;
        device_insurance.txn_hash = policy.txn_hash;
        device_insurance.policy_id = policy._id;
        device_insurance.device_type = req.body.device_type;
        device_insurance.brand = req.body.brand;
        device_insurance.value = req.body.value;
        device_insurance.purchase_month = req.body.purchase_month;
        device_insurance.model = req.body.model;
        device_insurance.plan_type = req.body.plan_type;
        device_insurance.first_name = req.body.first_name;
        device_insurance.last_name = req.body.last_name;
        device_insurance.email = req.body.email;
        device_insurance.phone = req.body.phone;
        device_insurance.currency = req.body.currency;
        device_insurance.amount = req.body.amount;
        device_insurance.discount_amount = req.body.discount_amount;
        device_insurance.tax = req.body.tax;
        device_insurance.total_amount = req.body.total_amount;

        device_insurance.status = policy.status;
        await device_insurance.save();

        policy.reference_id = device_insurance._id;
        policy.save();

        return res.status(200).send(utils.apiResponse(true, "Policy added successfully.", {
            _id: policy._id,
            txn_hash: policy.txn_hash
        }));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.deviceConfirmPayment = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({
            user_id: req.user._id,
            _id: req.params.id,
            product_type: constant.ProductTypes.device_insurance
        });

        let device_insurance = await DeviceInsurance.findOne({
            _id: policy.reference_id
        });

        if (!policy || !device_insurance) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let rules = {
            "payment_status": ["required", "in:paid,cancelled"],
            "blockchain": ["required"],
            "wallet_address": ["required"],
            "block_timestamp": ["required"],
            "txn_type": ["required"],
            "payment_hash": ["required"],
            "currency": ["required"],
            "paid_amount": ["required", "numeric"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            return res.status(200).send(utils.apiResponseData(false, v.errors));
        }

        /**
         * TODO:
         * Error Report
         * if req.body.paid_amount does not match with policy.total_amount
         */

        // Create Payment
        let payment = new Payments;
        payment.payment_status = req.body.payment_status;
        payment.blockchain = req.body.blockchain;
        payment.wallet_address = req.body.wallet_address;
        payment.block_timestamp = req.body.block_timestamp;
        payment.txn_type = req.body.txn_type;
        payment.payment_hash = req.body.payment_hash;
        payment.currency = req.body.currency;
        payment.paid_amount = req.body.paid_amount;
        await payment.save();

        // Update payment to Policies
        policy.payment_status = req.body.payment_status;
        policy.PaymentStatusHistory.push({
            status: req.body.payment_status,
            updated_at: new Date(moment())
        });
        policy.payment_id = payment._id;
        policy.blockchain = req.body.blockchain;
        policy.wallet_address = req.body.wallet_address;
        policy.block_timestamp = req.body.block_timestamp;
        policy.txn_type = req.body.txn_type;
        policy.payment_hash = req.body.payment_hash;
        policy.currency = req.body.currency;

        if (policy.payment_status == constant.PolicyPaymentStatus.paid) {
            policy.status = constant.PolicyStatus.active;
            policy.StatusHistory.push({
                status: policy.status,
                updated_at: new Date(moment()),
                updated_by: req.user._id
            });

            // Update payment to MSO Policies
            device_insurance.status = policy.status;
            await device_insurance.save();
        }

        await policy.save();

        return res.status(200).send(utils.apiResponse(true, "Payment detail updated successfully.", {
            policy_id: policy._id,
            txn_hash: policy.txn_hash,
            payment_status: policy.payment_status,
            status: policy.status
        }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.policyReview = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({
            _id: req.params.id
        });

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }else if( ![constant.PolicyStatus.active, constant.PolicyStatus.complete].includes(policy.status) ){
            return res.status(200).send(utils.apiResponseMessage(false, "Policy status is not activated."));
        }

        let rules = {
            "rating": ["required", "numeric"],
            "review": ["required"],
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        let review = await Reviews.findOne({ 
            user_id: req.user._id,
            policy_id: req.params.id
        });

        if(!review){
            review = new Reviews;
            review.user_id = req.user._id;
            review.policy_id = req.params.id;
        }

        review.rating = req.body.rating;
        review.review = req.body.review;
        await review.save();

        return res.status(200).send(utils.apiResponse(true, "Review added successfully.", {
            _id: review._id,
        }));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.get = async (req, res, next) => {
    try {

        let policies = await Policies.getPolicies([constant.ProductTypes.device_insurance, constant.ProductTypes.mso_policy], { user_id: req.user._id });

        policies = policies.map(policy => {
            policy.details = policy.reference_id;
            delete policy.reference_id;
            return policy;
        })

        return res.status(200).send(utils.apiResponseData(true, { policies }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.show = async (req, res, next) => {
    try {
        let policy = await Policies.findOne({ user_id: req.user._id, _id: req.params.id });
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
        policy = await Policies.getPolicies(policy.product_type, { user_id: req.user._id, _id: req.params.id });

        return res.status(200).send(utils.apiResponseData(true, { ...policy[0], reviews }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}




