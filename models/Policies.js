'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const constant = require('../libs/constants');
const Schema = mongoose.Schema;
const moment = require('moment');
const msoPlans = require("./../libs/mso-plans");

/**
 * Policies Schema
 */

const PoliciesSchema = new Schema({
    user_id: { type: Schema.ObjectId, ref: "Users" },
    txn_hash: { type: String, default: null },
    product_type: { type: String, default: null },
    reference_id: { type: Schema.ObjectId, default: null },
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
    total_amount: { type: Number, default: null }
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
        this.txn_hash = await PolicyTxnHashCount.getNewTxnHash(this.product_type);
        next();
    } else { next() }
});

PoliciesSchema.statics = {
    /**
     * 
     * @param {"mso_policy"|"device_insurance"|"smart_contract"|"crypto_exchange"|Array} product_type 
     * @param {Object} find
     */
    getPolicies: async function (product_type, find = {}) {

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
                })
                .lean();
            
            if(Array.isArray(mso_policies)){
                mso_policies = mso_policies.map((policy) => {
                    let plan = msoPlans.find(plan => plan.unique_id == _.get(policy, "reference_id.plan_type"));
                    policy.plan_details = _.get(policy, "plan_details", {});
                    policy.plan_details = {...policy.plan_details, ...plan};
                    return policy;
                })
            }

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

        if (Array.isArray(policies) && policies.length) {
            policies.sort((a, b) => { return moment(b.createdAt).format("X") - moment(a.createdAt).format("X") })
        }

        return policies;
    }
}

mongoose.model('Policies', PoliciesSchema, "policies");
