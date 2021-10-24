'use strict';

const _ = require('lodash');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const constant = require('../libs/constants');
const utils = require('../libs/utils');
const Schema = mongoose.Schema;


/**
 * P4LToken Schema
 */

const PolicyTxnHashCountSchema = new Schema({
    total_count: { type: Number, default: 0 },
    mso_policy: { type: Number, default: 0 },
    device_insurance: { type: Number, default: 0 },
    smart_contract: { type: Number, default: 0 },
    crypto_exchange: { type: Number, default: 0 }
}, {
    timestamps: true
});

PolicyTxnHashCountSchema.statics = {
    /**
     * 
     * @param {"mso_policy", "device_insurance", "smart_contract", "crypto_exchange"} type 
     * @returns 
     */
    getNewTxnHash: async function (type) {
        const PolicyTxnHashCount = mongoose.model('PolicyTxnHashCount');

        // Get Token
        let record = await PolicyTxnHashCount.findOne({});

        if(!record){
            record = new PolicyTxnHashCount;
        }

        let txn_hash = "";
        
        record.total_count = parseInt(_.get(record, "total_count", 0)) + 1;

        if(type == constant.ProductTypes.mso_policy){
            record.mso_policy = parseInt(_.get(record, "mso_policy", 0)) + 1;
            txn_hash = `MSO-${utils.getPadNumber(record.mso_policy)}0${record.total_count}`;
        }else if(type == constant.ProductTypes.device_insurance){
            record.device_insurance = parseInt(_.get(record, "device_insurance", 0)) + 1;
            txn_hash = `DEVICE-${utils.getPadNumber(record.device_insurance)}0${record.total_count}`;
        }else if(type == constant.ProductTypes.smart_contract){
            record.smart_contract = parseInt(_.get(record, "smart_contract", 0)) + 1;
            txn_hash = `SC-${utils.getPadNumber(record.smart_contract)}0${record.total_count}`;
        }else if(type == constant.ProductTypes.crypto_exchange){
            record.crypto_exchange = parseInt(_.get(record, "crypto_exchange", 0)) + 1;
            txn_hash = `CE-${utils.getPadNumber(record.crypto_exchange)}0${record.total_count}`;
        }
        await record.save();
        return txn_hash;
    },

    generateToken: function () {

        return jwt.sign({},
            config.p4l_secret, {
            expiresIn: parseInt(config.JWT_TOKEN_EXPIRY),
        });

    },

    isValidToken: function (token) {
        try {
            const verified = jwt.verify(token, config.p4l_secret);
            console.log(verified);
            return true;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
            }
        }
        return false;
    }

}

mongoose.model('PolicyTxnHashCount', PolicyTxnHashCountSchema);
