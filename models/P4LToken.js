'use strict';

const _ = require('lodash');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const Schema = mongoose.Schema;


/**
 * P4LToken Schema
 */

const P4LTokenSchema = new Schema({
    token: { type: String, default: null }
}, {
    timestamps: true
});

P4LTokenSchema.statics = {
    getToken: async function () {
        const P4LToken = mongoose.model('P4LToken');

        // Get Token
        let token = await P4LToken.findOne({ token: { $nin: ["", null] } });

        // Check Is Expired
        if(!token || !this.isValidToken(token.token)){
            // Generate New token
            if (!token) {
                token = new P4LToken;
            }
            token.token = this.generateToken();
            token.save();
        }

        // Respond with token
        return token.token;
    },

    generateToken: function () {

        return jwt.sign({},
            config.p4l_secret, {
            expiresIn: parseInt(config.JWT_TOKEN_EXPIRY),
        });

    },

    isValidToken: function(token){
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

mongoose.model('P4LToken', P4LTokenSchema, "p4ltokens");
