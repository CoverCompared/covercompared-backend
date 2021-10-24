'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * PolicyRequests Schema
    user_id     - Users._id
 */
const PolicyRequestsSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null, ref: "Users" },
    product_type: { type: String, default: null },
    country: { type: String, default: null },
    email: { type: String, default: null },
}, { timestamps: true });

mongoose.model('PolicyRequests', PolicyRequestsSchema);
