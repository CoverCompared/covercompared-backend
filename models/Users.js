'use strict';

const _ = require('lodash');
var mime = require('mime-types')
const crypto = require('crypto');
const ObjectId = require("mongodb").ObjectId;
const mongoose = require('mongoose');
const utils = require('../libs/utils');
const Schema = mongoose.Schema;


/**
 * Users Schema
 */

const UsersSchema = new Schema({
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    email: { type: String, default: null },
    email_verified_at: { type: Date, default: null },
    hashed_password: { type: String, default: null },
    firebase_uid: { type: String, default: null },
    otp: { type: String, default: null },
    otp_expire_at: { type: Date, default: null },
    cart_items: { type : Schema.Types.Mixed },
    status: { type: Boolean, default: null },
    roles: [{ type: String, default: null }]
}, {
    timestamps: true
});

const validatePresenceOf = value => value && value.length;

/**
 * Virtuals
 */

UsersSchema.virtual('password')
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function () {
        return this._password;
    });


/**
* Pre-save hook
*/

UsersSchema.pre('save', function (next) {
    if (!this.isNew) return next();
    if (this.password) {
        if (!validatePresenceOf(this.password)) {
            next(new Error('Invalid password'));
        } else { next(); }
    } else { next() }
});

UsersSchema.methods = {

    /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */


    authenticate: function (plainText) {
        console.log(this.encryptPassword(plainText), this.hashed_password);
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */

    makeSalt: function () {
        return Math.round(new Date().valueOf() * Math.random()) + '';
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */

    encryptPassword: function (password) {
        if (!password) return '';
        try {
            return crypto
                .createHmac('sha1', config.passwordSecret)
                .update(password)
                .digest('hex');
        } catch (err) {
            return '';
        }
    },
    getWalletAddress : async function(wallet_address){
        const WalletAddresses = mongoose.model("WalletAddresses");
        let wallet = await WalletAddresses.findOne({ user_id : utils.getObjectID(this._id), wallet_address });
        return wallet;
    }
}

UsersSchema.statics = {
    
    getUser: async function (wallet_address) {

        const WalletAddresses = mongoose.model("WalletAddresses");
        const Users = mongoose.model("Users");

        // Find Wallet Address
        let wallet = await WalletAddresses.findOne({ wallet_address });
        let user;
        if (wallet) {
            user = await Users.findOne({ _id: ObjectId(wallet.user_id) });

            if (!user) {
                /**
                 * TODO: Send Error Report : Wallet address exist but user not found
                 */
                return false;
            }

        } else {
            user = new Users;
            await user.save();

            wallet = new WalletAddresses;
            wallet.wallet_address = wallet_address;
            wallet.user_id = user._id;
            await wallet.save();
        }
       return user; 
    },
}
mongoose.model('Users', UsersSchema);