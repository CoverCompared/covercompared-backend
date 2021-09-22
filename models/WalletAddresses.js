'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Users Schema
 */

const WalletAddressesSchema = new Schema({
    user_id: { type: Schema.ObjectId, default: null },
    wallet_address: { type: String, default: null }
}, {
    timestamps: true
});

mongoose.model('WalletAddresses', WalletAddressesSchema);
