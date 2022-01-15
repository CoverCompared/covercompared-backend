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
    network: { type: String, default: null },
    crypto_currency: { type: String, default: null },
    crypto_amount: { type: Number, default: null },
    blockchain: { type: String, default: null },
    wallet_address: { type: String, default: null },
    block_timestamp: { type: String, default: null },
    txn_type: { type: String, default: null },
    payment_hash: { type: String, default: null },
    currency: { type: String, default: null },
    paid_amount: { type: String, default: null },
    payment_status: { type: String, default: null },
    TokenTransferred: [{
        from: { type: String, default:null },
        to: { type: String, defualt: null },
        token_address: { type: String, default: null },
        value: { type: String, default: null }
    }]
}, {
    timestamps: true
});

mongoose.model('Payments', PaymentsSchema, "payments");
