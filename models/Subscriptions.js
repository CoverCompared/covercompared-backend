'use strict';

const _ = require('lodash');
const fs = require('fs');
var mime = require('mime-types')
const crypto = require('crypto');

const mongoose = require('mongoose');
const { setStrNotationRepetition } = require('node-input-validator');
const config = require('../config');
const Schema = mongoose.Schema;



/**
 * Subscriptions Schema
 */


const SubscriptionsSchema = new Schema({
    name: { type: String, default: null },
    email: { type: String, default: null },
    status: { type: String, default: null },
    unsubscribe_token: { type: String, default: null },
    reason: { type: String, default: null },
    status_history: [{
        status: { type: String, default: null },
        updated_at: { type: Date, default: null }
    }]
}, {
    timestamps: true
});

SubscriptionsSchema.methods = {

}

SubscriptionsSchema.statics = {
    STATUS: {
        SUBSCRIBED : "subscribed",
        UNSUBSCRIBED: "unsubscribed"
    }
}

mongoose.model('Subscriptions', SubscriptionsSchema);
