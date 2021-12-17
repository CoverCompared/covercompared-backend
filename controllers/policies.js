const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Policies = mongoose.model('Policies');
const Reviews = mongoose.model('Reviews');
const Payments = mongoose.model("Payments");
const niv = require("./../libs/nivValidations");
const constant = require("../libs/constants");
const moment = require('moment');
const msoPlans = require("../libs/mso-plans");

exports.storeMso = async (req, res, next) => {
    try {
        let plan_types = msoPlans.map(plan => (plan.unique_id));

        let rules = {
            "plan_type": ["required", `in:${plan_types.join(",")}`],
            "country": ["nullable"],
            "quote": ["required"],
            "name": ["nullable"],
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
            "MSOMembers.*.dob": ["required", "dateFormat:YYYY-MM-DD"],
            "MSOMembers.*.identity_type": ["nullable"],
            "MSOMembers.*.identity": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
            return;
        }

        if (utils.getFormattedAmount(parseFloat(req.body.amount)) != utils.getFormattedAmount(parseFloat(req.body.quote) + parseFloat(req.body.mso_addon_service))) {
            return res.status(200).send(utils.apiResponseMessage(false, "Amount does not match of Quote and Addon Service"));
        }

        if (utils.getFormattedAmount(parseFloat(req.body.total_amount)) != utils.getFormattedAmount((parseFloat(req.body.amount) - parseFloat(req.body.discount_amount)) + parseFloat(req.body.tax))) {
            return res.status(200).send(utils.apiResponseMessage(false, "Total Amount is invalid."));
        }

        let plan = msoPlans.find(plan => plan.unique_id == req.body.plan_type);

        let plan_details = {
            name: _.get(plan, "name", ""),
            type: _.get(plan, "type", ""),
            MSOPlanDuration: _.get(plan, "MSOPlanDuration", ""),
            MSOCoverUser: _.get(plan, "MSOCoverUser", ""),
            MSOCoverUserLimit: _.get(plan, "MSOCoverUserLimit", ""),
            totalUsers: _.get(plan, "totalUsers", ""),
        };

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
        policy.MSOPolicy = {
            plan_type: req.body.plan_type,
            name: req.body.name ? req.body.name : plan_details.name,
            country: req.body.country,
            mso_cover_user: req.body.mso_cover_user,
            policy_price: req.body.quote,
            quote: req.body.quote,
            mso_addon_service: req.body.mso_addon_service,
            amount: req.body.amount,
            plan_details: plan_details,
            MSOMembers: []
        }
        for (const key in req.body.MSOMembers) {
            policy.MSOPolicy.MSOMembers.push({
                user_type: req.body.MSOMembers[key].user_type,
                first_name: req.body.MSOMembers[key].first_name,
                last_name: req.body.MSOMembers[key].last_name,
                country: req.body.MSOMembers[key].country,
                dob: new Date(moment(req.body.MSOMembers[key].dob, "YYYY-MM-DD")),
                identity_type: req.body.MSOMembers[key].identity_type,
                identity: req.body.MSOMembers[key].identity
            })
        }

        await policy.save();


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

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let rules = {
            "payment_status": ["required", "in:paid,cancelled"],
            "network": ["nullable"],
            "crypto_currency": ["nullable"],
            "crypto_amount": ["nullable"],
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
            return res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors));
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
        payment.network = _.get(req.body, "network", null);
        payment.crypto_currency = _.get(req.body, "crypto_currency", null);
        payment.crypto_amount = _.get(req.body, "crypto_amount", null);
        await payment.save();

        // Update payment to Policies
        policy.crypto_currency = _.get(req.body, "crypto_currency", null);
        policy.crypto_amount = _.get(req.body, "crypto_amount", null);
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
            "model_name": ["nullable"],
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
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
        policy.DeviceInsurance = {
            device_type: req.body.device_type,
            brand: req.body.brand,
            value: req.body.value,
            purchase_month: req.body.purchase_month,
            model: req.body.model,
            model_name: req.body.model_name,
            plan_type: req.body.plan_type,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            phone: req.body.phone
        }
        await policy.save();

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

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let rules = {
            "payment_status": ["required", "in:paid,cancelled"],
            "network": ["nullable"],
            "crypto_currency": ["nullable"],
            "crypto_amount": ["nullable"],
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
            return res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors));
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
        payment.network = _.get(req.body, "network", null);
        payment.crypto_currency = _.get(req.body, "crypto_currency", null);
        payment.crypto_amount = _.get(req.body, "crypto_amount", null);
        await payment.save();

        // Update payment to Policies
        policy.crypto_currency = _.get(req.body, "crypto_currency", null);
        policy.crypto_amount = _.get(req.body, "crypto_amount", null);
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
             * If policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        } else if (![constant.PolicyStatus.active, constant.PolicyStatus.complete].includes(policy.status)) {
            return res.status(200).send(utils.apiResponseMessage(false, "Policy status is not activated."));
        }

        let rules = {
            "rating": ["required", "numeric"],
            "review": ["required"],
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
            return;
        }

        let review = await Reviews.findOne({
            user_id: req.user._id,
            policy_id: req.params.id
        });

        if (!review) {
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

        let policies = await Policies.getPolicies([constant.ProductTypes.device_insurance, constant.ProductTypes.mso_policy, constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange], { user_id: req.user._id });

        let policy;
        for (const key in policies) {
            policy = policies[key];
            if (policy.product_type == constant.ProductTypes.smart_contract) {
                policy.logo = await companies.getCoverImage(_.get(policy, "details.unique_id", ""))
            } else if (policy.product_type == constant.ProductTypes.crypto_exchange) {
                policy.logo = await companies.getCoverImage(_.get(policy, "details.unique_id", ""))
            } else if (policy.product_type == constant.ProductTypes.mso_policy) {
                policy.logo = `${config.api_url}images/mso.png`;
            } else if (policy.product_type == constant.ProductTypes.device_insurance) {
                policy.logo = `${config.api_url}images/p4l.png`;
            }
            policies[key] = policy;
        }

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
             * If policy record not found in database
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

exports.storeSmartContract = async (req, res, next) => {

    /**
     * TODO: Create Error report if the (company_code|unique_id) is not in our list
     */

    /**
     * TODO: For production environment if request does not pass validation therefor store the request data and then respond fail
     */

    try {
        let rules = {
            "company_code": ["required"],
            "product_id": ["nullable"],
            "token_id": ["nullable"],
            "unique_id": ["required"],
            "address": ["required"],
            "name": ["required"],
            "type": ["required"],
            "duration_days": ["required", "numeric"],
            "chain": ["required"],
            "crypto_currency": ["required"],
            "crypto_amount": ["required", "numeric"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
            return;
        }

        let policy = new Policies;
        policy.user_id = req.user._id;

        if (req.body.type == "protocol") {
            policy.product_type = constant.ProductTypes.smart_contract;
        } else {
            policy.product_type = constant.ProductTypes.crypto_exchange;
        }

        policy.status = constant.PolicyStatus.pending;
        policy.StatusHistory.push({
            status: policy.status,
            updated_at: new Date(moment()),
            updated_by: req.user._id
        });
        policy.payment_status = constant.PolicyPaymentStatus.unpaid;
        policy.crypto_currency = req.body.crypto_currency;
        policy.crypto_amount = req.body.crypto_amount;
        if (req.body.type == "protocol") {
            policy.SmartContract = {
                company_code: req.body.company_code,
                product_id: req.body.product_id,
                token_id: req.body.token_id,
                unique_id: req.body.unique_id,
                address: req.body.address,
                name: req.body.name,
                type: req.body.type,
                duration_days: req.body.duration_days,
                chain: req.body.chain,
                crypto_currency: req.body.crypto_currency,
                crypto_amount: req.body.crypto_amount
            }
        } else {
            policy.CryptoExchange = {
                company_code: req.body.company_code,
                product_id: req.body.product_id,
                token_id: req.body.token_id,
                unique_id: req.body.unique_id,
                address: req.body.address,
                name: req.body.name,
                type: req.body.type,
                duration_days: req.body.duration_days,
                chain: req.body.chain,
                crypto_currency: req.body.crypto_currency,
                crypto_amount: req.body.crypto_amount
            }
        }
        await policy.save();
        let product_type = req.body.type == "protocol" ? "Smart Contract" : "Crypto Exchange";

        return res.status(200).send(utils.apiResponse(true, `${product_type} added successfully.`, {
            _id: policy._id,
            txn_hash: policy.txn_hash
        }));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.smartContractConfirmPayment = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({
            user_id: req.user._id,
            _id: req.params.id,
            product_type: { "$in": [constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange] }
        });

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Cover not found."));
        }

        let rules = {
            "payment_status": ["required", "in:paid,cancelled"],
            "network": ["nullable"],
            "token_id": ["nullable"],
            "crypto_currency": ["nullable"],
            "crypto_amount": ["nullable"],
            "blockchain": ["required"],
            "wallet_address": ["required"],
            "block_timestamp": ["required"],
            "txn_type": ["required"],
            "payment_hash": ["required"],
            "currency": ["nullable"],
            "paid_amount": ["nullable", "numeric"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            return res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors));
        }

        /**
         * TODO:
         * Error Report
         * if req.body.crypto_amount does not match with policy.crypto_amount
         */

        // Create Payment
        let payment = new Payments;
        payment.payment_status = req.body.payment_status;
        payment.blockchain = req.body.blockchain;
        payment.wallet_address = req.body.wallet_address;
        payment.block_timestamp = req.body.block_timestamp;
        payment.txn_type = req.body.txn_type;
        payment.payment_hash = req.body.payment_hash;
        payment.currency = _.get(req.body, "currency", null);
        payment.paid_amount = _.get(req.body, "paid_amount", null);
        payment.network = _.get(req.body, "network", null);
        payment.crypto_currency = _.get(req.body, "crypto_currency", null);
        payment.crypto_amount = _.get(req.body, "crypto_amount", null);
        await payment.save();

        // Update payment to Policies
        policy.crypto_currency = _.get(req.body, "crypto_currency", null);
        policy.crypto_amount = _.get(req.body, "crypto_amount", null);
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
        policy.currency = _.get(req.body, "currency", null);

        if (policy.payment_status == constant.PolicyPaymentStatus.paid) {
            policy.status = constant.PolicyStatus.active;
            policy.StatusHistory.push({
                status: policy.status,
                updated_at: new Date(moment()),
                updated_by: req.user._id
            });
        }

        if(req.body.token_id){
            if (policy.product_type == constant.ProductTypes.smart_contract) {
                policy.SmartContract.token_id= req.body.token_id;
            } else {
                policy.CryptoExchange.token_id= req.body.token_id;
            }
        }

        await policy.save();

        return res.status(200).send(utils.apiResponse(true, "Cover detail updated successfully.", {
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