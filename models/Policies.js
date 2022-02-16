'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const constant = require('../libs/constants');
const Schema = mongoose.Schema;
const moment = require('moment');
const msoPlans = require("./../libs/mso-plans");
const utils = require('../libs/utils');
const config = require('../config');
const axios = require("axios");

/**
 * Policies Schema
 * user_id         - Users._id
 * payment_id      - Payments._id
 * product_type    - mso-policy, device-insurance
 * status          - pending, active, cancelled
 * payment_status  - unpaid, paid, cancelled
 * 
 * MSOPolicy.plan_type       - BASIC_PLAN, SILVER_PLAN, GOLD_PLAN, PLATINUM_PLAN
 * MSOPolicy.amount          - policy_price + mso_addon_service
 * MSOPolicy.user_type       - Main Member, Spouse, Dependent, Main Member Parent, Spouse Parent
 * MSOPolicy.identity_type   - passport, adhar
 * 
 * DeviceInsurance.plan_type   - monthly, yearly
 * 
 */

const PoliciesSchema = new Schema({
    user_id: { type: Schema.ObjectId, ref: "Users" },
    txn_hash: { type: String, default: null },
    mso_policy_number: { type: String, default: null },
    product_type: { type: String, default: null },
    status: { type: String, default: null },
    StatusHistory: [{
        status: { type: String, default: null },
        updated_at: { type: Date, default: null },
        updated_by: { type: Schema.ObjectId, default: null }
    }],
    payment_status: { type: String, default: null },
    PaymentStatusHistory: [{
        status: { type: String, default: null },
        updated_at: { type: Date, default: null }
    }],
    payment_id: { type: Schema.ObjectId, ref: "Payments" },
    blockchain: { type: String, default: null },
    wallet_address: { type: String, default: null },
    block_timestamp: { type: Schema.Types.Mixed, default: null },
    txn_type: { type: String, default: null },
    payment_hash: { type: String, default: null },
    currency: { type: String, default: null },
    amount: { type: Number, default: null },
    discount_amount: { type: Number, default: null },
    tax: { type: Number, default: null },
    total_amount: { type: Number, default: null },
    crypto_currency: { type: String, default: null },
    crypto_amount: { type: Number, default: null },
    MSOPolicy: {
        membership_id: { type: String, default: null },
        plan_type: { type: String, default: null },
        name: { type: String, default: null },
        country: { type: String, default: null },
        mso_cover_user: { type: String, default: null },
        policy_price: { type: Number, default: null },
        quote: { type: String, default: null },
        mso_addon_service: { type: Number, default: null },
        amount: { type: Number, default: null },
        signature: { type: Schema.Types.Mixed, default: null },
        contract_product_id: { type: String, default: null },
        start_time: { type: Schema.Types.Mixed, default: null },
        MSOMembers: [{
            user_type: { type: String, default: null },
            first_name: { type: String, default: null },
            last_name: { type: String, default: null },
            country: { type: String, default: null },
            dob: { type: Date, default: null },
            identity_type: { type: String, default: null },
            identity: { type: String, default: null }
        }],
        plan_details: { type: Schema.Types.Mixed, default: null }
    },
    DeviceInsurance: {
        p4l_create_policy_response_ok: { type: Boolean, default: null },
        p4l_create_policy_requests: [{
            request_payload: { type: Schema.Types.Mixed, default: null },
            response_data: { type: Schema.Types.Mixed, default: null },
            response_status: { type: Schema.Types.Mixed, default: null },
            status: { type: Boolean, default: null }
        }],
        device_type: { type: String, default: null },
        brand: { type: String, default: null },
        value: { type: String, default: null },
        month: { type: String, default: null },
        purchase_month: { type: String, default: null },
        model: { type: String, default: null },
        model_name: { type: String, default: null },
        plan_type: { type: String, default: null },
        first_name: { type: String, default: null },
        last_name: { type: String, default: null },
        email: { type: String, default: null },
        phone: { type: Number, default: null },
        signature: { type: Schema.Types.Mixed, default: null },
        start_time: { type: Schema.Types.Mixed, default: null },
        durPlan: { type: Number, default: null },
        contract_product_id: { type: String, default: null },
        imei_or_serial_number: { type: String, default: null },
        model_code: { type: String, default: null },
        custom_device_name: { type: String, default: null },
        tran_id: { type: String, default: null },
        purchase_date: { type: String, default: null },
        partner_code: { type: String, default: null }
    },
    SmartContract: {
        block: { type: String, default: null },
        network: { type: String, default: null },
        company_code: { type: String, default: null },
        product_id: { type: String, default: null },
        token_id: { type: String, default: null },
        unique_id: { type: String, default: null },
        address: { type: String, default: null },
        name: { type: String, default: null },
        type: { type: String, default: null },
        duration_days: { type: String, default: null },
        chain: { type: String, default: null },
        crypto_currency: { type: String, default: null },
        currency_address: { type: String, default: null },
        crypto_amount: { type: Number, default: null },
        expiry: { type: Schema.Types.Mixed, default: null },
        sumAssured: { type: Schema.Types.Mixed, default: null },
        premium: { type: Schema.Types.Mixed, default: null },
        premiumNXM: { type: Schema.Types.Mixed, default: null },
        coverId: { type: Schema.Types.Mixed, default: null }
    },
    CryptoExchange: {
        block: { type: String, default: null },
        network: { type: String, default: null },
        company_code: { type: String, default: null },
        product_id: { type: String, default: null },
        token_id: { type: String, default: null },
        unique_id: { type: String, default: null },
        address: { type: String, default: null },
        name: { type: String, default: null },
        type: { type: String, default: null },
        duration_days: { type: String, default: null },
        chain: { type: String, default: null },
        crypto_currency: { type: String, default: null },
        currency_address: { type: String, default: null },
        crypto_amount: { type: Number, default: null },
        expiry: { type: Schema.Types.Mixed, default: null },
        sumAssured: { type: Schema.Types.Mixed, default: null },
        premium: { type: Schema.Types.Mixed, default: null },
        premiumNXM: { type: Schema.Types.Mixed, default: null },
        coverId: { type: Schema.Types.Mixed, default: null }
    }
}, {
    timestamps: true
});

/**
 * Pre-save hook
 */

PoliciesSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    if (!this.txn_hash) {
        const PolicyTxnHashCount = mongoose.model('PolicyTxnHashCount');
        let policy_number = await PolicyTxnHashCount.getNewTxnHash(this.product_type)
        this.txn_hash = policy_number.txn_hash;
        this.mso_policy_number = policy_number.mso_policy_number;
        next();
    } else { next() }
});

PoliciesSchema.statics = {
    /**
     * 
     * @param {"mso_policy"|"device_insurance"|"smart_contract"|"crypto_exchange"|Array} product_type 
     * @param {Object} find
     */
    getPolicies: async function (product_type, find = {}, review = false, payment = false) {

        const Policies = mongoose.model("Policies");
        const Reviews = mongoose.model('Reviews');
        const Payments = mongoose.model('Payments');

        product_type = typeof product_type == "string" ? [product_type] : product_type;

        let findObj = { ...find, product_type: { $in: product_type } };

        let project = {
            StatusHistory: 0,
            PaymentStatusHistory: 0,
            user_id: 0,
            payment_id: 0
        };
        let aggregates = [];
        aggregates.push({ $match: findObj })

        if (review) {
            aggregates.push({
                $lookup:
                {
                    from: Reviews.collection.collectionName,
                    localField: "_id",
                    foreignField: "policy_id",
                    as: "review"
                }
            });
            project["review._id"] = 0
            project["review.user_id"] = 0
            project["review.createdAt"] = 0
            project["review.updatedAt"] = 0
        }

        if (payment) {
            aggregates.push({
                $lookup:
                {
                    from: Payments.collection.collectionName,
                    localField: "payment_id",
                    foreignField: "_id",
                    as: "payment"
                }
            });
            project["payment._id"] = 0
            project["payment.user_id"] = 0
            project["payment.createdAt"] = 0
            project["payment.updatedAt"] = 0
        }

        aggregates.push({ $sort: { _id: -1 } });
        aggregates.push({ $project: project });

        let policies = await Policies.aggregate(aggregates);

        if (Array.isArray(policies)) {
            policies = policies.map((policy) => {
                if (policy.product_type == constant.ProductTypes.mso_policy) {
                    let plan = msoPlans.find(plan => plan.unique_id == _.get(policy, "reference_id.plan_type"));
                    policy.plan_details = _.get(policy, "plan_details", {});
                    policy.plan_details = { ...policy.plan_details, ...plan };
                }

                if (policy.product_type == constant.ProductTypes.mso_policy) {
                    policy.details = policy.MSOPolicy;
                } else if (policy.product_type == constant.ProductTypes.device_insurance) {
                    policy.details = policy.DeviceInsurance;
                } else if (policy.product_type == constant.ProductTypes.smart_contract) {
                    policy.details = policy.SmartContract;
                } else if (policy.product_type == constant.ProductTypes.crypto_exchange) {
                    policy.details = policy.CryptoExchange;
                }

                delete policy.MSOPolicy;
                delete policy.DeviceInsurance;
                delete policy.SmartContract;
                delete policy.CryptoExchange;
                if (policy.details && policy.details.signature) delete policy.details.signature
                if (policy.payment && Array.isArray(policy.payment) && policy.payment.length) {
                    policy.payment = policy.payment.map((payment) => {
                        payment.crypto_currency = _.get(payment, "crypto_currency", false) ? _.get(payment, "crypto_currency", false) : "";
                        payment.crypto_amount = _.get(payment, "crypto_amount", false) ? _.get(payment, "crypto_amount", false) : "";
                        return payment;
                    })
                }
                policy.crypto_currency = _.get(policy, "crypto_currency", false) ? _.get(policy, "crypto_currency", false) : "";
                policy.crypto_amount = _.get(policy, "crypto_amount", false) ? _.get(policy, "crypto_amount", false) : "";
                return policy;
            })
        }

        if (Array.isArray(policies) && policies.length) {
            policies.sort((a, b) => { return moment(b.createdAt).format("X") - moment(a.createdAt).format("X") })
        }

        return policies;
    },
    checkPolicyForTransactionHash: async function(transaction_hash, policy_id){
        const Policies = mongoose.model("Policies");
        let policyNeedToDelete = await Policies.aggregate([
            { $match: { payment_hash: transaction_hash, _id: { $nin: [utils.getObjectID(policy_id)] } } },
            { $project: { _id: 1, product_type: 1,  "SmartContract.company_code": 1, "CryptoExchange.company_code": 1 } }
        ])
        if(policyNeedToDelete && Array.isArray(policyNeedToDelete) && policyNeedToDelete.length >= 1){
            let policy = policyNeedToDelete[0];

            let product_type = _.get(policy, "product_type", false);
            let company_code = _.get(policy, "SmartContract.company_code", false);
            if(!company_code){
                company_code = _.get(policy, "CryptoExchange.company_code", false);
            }

            console.error("Found more than one policy ", product_type, company_code, policy._id, transaction_hash);
            /**
             * TODO: Send ERROR Report
             * Message : There are more than two policy for this transaction hash
             * product_type, company_code, config.is_mainnet, transaction_hash
             */
        }
    }
}

PoliciesSchema.methods = {
    getMembershipID: function () {
        if (this.product_type == constant.ProductTypes.mso_policy) {
            return utils.getMsoPolicyMembershipId(this.createdAt, this.txn_hash);
        } else {
            return "-";
        }
    },

    /**
     * Call function when want to push details to p4l partner
     * Before calling this function must confirm that all the details are available in record
     * Policy.product_type must be device_insurance
     */
    callP4LCreatePolicyRequest: async function () {
        if (
            this.product_type == constant.ProductTypes.device_insurance &&
            !_.get(this.DeviceInsurance, "p4l_create_policy_response_ok", false)
        ) {
            const P4LToken = mongoose.model('P4LToken');

            let request_payload = {
                first_name: _.get(this, "DeviceInsurance.first_name", ""),
                last_name: _.get(this, "DeviceInsurance.last_name", ""),
                mobile: _.get(this, "DeviceInsurance.mobile", ""),
                email: _.get(this, "DeviceInsurance.email", ""),
                model_code: _.get(this, "DeviceInsurance.model_code", ""),
                custom_device_name: _.get(this, "DeviceInsurance.custom_device_name", ""),
                imei_or_serial_number: _.get(this, "DeviceInsurance.imei_or_serial_number", ""),
                tran_id: _.get(this, "DeviceInsurance.tran_id", ""),
                purchase_date: _.get(this, "DeviceInsurance.purchase_date", ""),
                partner_code: _.get(this, "DeviceInsurance.partner_code", ""),
            };

            let req_config = {
                method: "post",
                url: `${config.p4l_api_baseurl}create-policy-api/`,
                headers: {
                    Authorization: await P4LToken.getToken(),
                    "Content-Type": "application/json",
                },
                data: request_payload,
            };

            let response = {};
            let response_status;
            let p4l_create_policy_response_ok = _.get(this.DeviceInsurance, "p4l_create_policy_response_ok", false);
            let response_data;
            try {
                response = await axios(req_config);
                response_status = _.get(response, "status", "");
                p4l_create_policy_response_ok = _.get(response, "data.status", false) == "OK" ? true : false;
                response_data = _.get(response, "data", "");
            } catch (error) {
                response_data = error
                // result = { status: false, error }
            }

            let PoliciesModel = this.constructor;
            let p4l_create_policy_request = {
                request_payload,
                response_data,
                response_status,
                status: p4l_create_policy_response_ok
            };
            await PoliciesModel.updateOne(
                { _id: this._id },
                {
                    "DeviceInsurance.p4l_create_policy_response_ok": p4l_create_policy_response_ok,
                    $push: { "DeviceInsurance.p4l_create_policy_requests": p4l_create_policy_request }
                }
            );

            return p4l_create_policy_response_ok;
        }

    }
}

mongoose.model('Policies', PoliciesSchema, "policies");
