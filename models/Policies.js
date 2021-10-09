'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Policies Schema
 */

const PoliciesSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null },
    txn_hash: { type: Schema.Types.Mixed, default: null },
    block_timestamp: { type: Schema.Types.Mixed, default: null },
    partner_id: { type: Schema.Types.Mixed, default: null },
    product_id: { type: Schema.Types.Mixed, default: null },
    amount_paid: { type: Schema.Types.Mixed, default: null },
    currency: { type: Schema.Types.Mixed, default: null },
    amount_covered: { type: Schema.Types.Mixed, default: null },
    cover_duration: { type: Schema.Types.Mixed, default: null },
    txn_type: { type: Schema.Types.Mixed, default: null },
    blockchain: { type: Schema.Types.Mixed, default: null },
}, {
    timestamps: true
});

mongoose.model('Policies', PoliciesSchema);
