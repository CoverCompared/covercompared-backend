'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Payments Schema
 */

const PaymentsSchema = new Schema({
    user_id: { type: Schema.ObjectId, ref: "Users" },
    policy_id: { type: Schema.ObjectId, ref: "Policies" },
    blockchain: { type: String, default: null },
    wallet_address: { type: String, default: null },
    block_timestamp: { type: String, default: null },
    txn_type: { type: String, default: null },
    payment_hash: { type: String, default: null },
    currency: { type: String, default: null },
    paid_amount: { type: String, default: null },
    payment_status: { type: String, default: null }
}, {
    timestamps: true
});

mongoose.model('Payments', PaymentsSchema, "payments");
