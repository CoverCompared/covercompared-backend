'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * MSOPolicies Schema
 * plan_type - BASIC_PLAN, SILVER_PLAN, GOLD_PLAN, PLATINUM_PLAN
 * amount      - policy_price + mso_addon_service
 * user_type   - Main Member, Spouse, Dependent, Main Member Parent, Spouse Parent
 * identity_type    - passport, adhar
 */
const MSOPoliciesSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null, ref: "Users" },
    txn_hash: { type: String, default: null },
    policy_id: { type: Schema.ObjectId, default: null, ref: "Policies" },
    plan_type: { type: String, default: null },
    quote: { type: String, default: null },
    name: { type: String, default: null },
    country: { type: String, default: null },
    mso_cover_user: { type: String, default: null },
    currency: { type: String, default: null },
    policy_price: { type: Number, default: null },
    mso_addon_service: { type: Number, default: null },
    amount: { type: Number, default: null },
    discount_amount: { type: Number, default: null },
    tax: { type: Number, default: null },
    total_amount: { type: Number, default: null },
    status: { type: String, default: null },
    MSOMembers: [{
        user_type: { type: String, default: null },
        first_name: { type: String, default: null },
        last_name: { type: String, default: null },
        country: { type: String, default: null },
        dob: { type: Date, default: null },
        identity_type: { type: String, default: null },
        identity: { type: String, default: null }
    }],
    plan_details: { type: Schema.Types.Mixed, default : null }
},
    {
        timestamps: true
    });

mongoose.model('MSOPolicies', MSOPoliciesSchema, "msopolicies");
