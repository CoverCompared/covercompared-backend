'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Users Schema
 */

const UsersSchema = new Schema({
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    email: { type: String, default: null },
    email_verified_at: { type: Date, default: null },
    otp: { type: String, default: null },
    otp_expire_at: { type: Date, default: null }
}, {
    timestamps: true
});

mongoose.model('Users', UsersSchema);
