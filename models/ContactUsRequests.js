'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ContactUsRequests Schema
 * user_type   : Customer, Partner, Other
 */

const ContactUsRequestsSchema = new Schema({
    name: {type: String, default: null},
    email: {type: String, default: null},
    user_type: {type: String, default:null},
    message: {type: String, default: null}
}, { timestamps: true });

mongoose.model('ContactUsRequests', ContactUsRequestsSchema, "contactusrequests");
