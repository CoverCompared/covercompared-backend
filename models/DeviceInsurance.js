'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * DeviceInsurance Schema
    user_id     - Users._id
    policy_id   - Policies._id
    plan_type   - monthly, yearly
 */
const DeviceInsuranceSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null, ref: "Users" },
    txn_hash: { type: String, default: null },
    policy_id: { type: Schema.ObjectId, default: null, ref: "Policies" },
    device_type: { type: String, default: null },
    brand: { type: String, default: null },
    value: { type: String, default: null },
    purchase_month: { type: String, default: null },
    model: { type: String, default: null },
    model_name: { type: String, default: null },
    plan_type: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: Number, default: null },
    currency: { type: String, default: null },
    amount: { type: Number, default: null },
    discount_amount: { type: Number, default: null },
    tax: { type: Number, default: null },
    total_amount: { type: Number, default: null },
    payment_hash: { type: String, default: null },
    status: { type: String, default: null },
   
},
    {
        timestamps: true
    });

mongoose.model('DeviceInsurance', DeviceInsuranceSchema, "deviceinsurances");
