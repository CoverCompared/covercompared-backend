'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * UnverifiedEmails Schema
 */

const UnverifiedEmailsSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null },
    email: { type: String, default: null },
    email_verified_at: { type: Date, default: null },
    otp: { type: String, default: null },
    otp_send_at: { type: Date, default: null }
}, {
    timestamps: true
});

mongoose.model('UnverifiedEmails', UnverifiedEmailsSchema, "unverifiedemails");
