const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const Users = mongoose.model('Users');
const WalletAddresses = mongoose.model('WalletAddresses');
const niv = require("./../libs/nivValidations");

exports.checkEmailExist = async (req, res, next) => {

    try {
        // Check Exist Already
        let rules = {
            "email": ["required", "email"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        // Find Email Exist
        let user = await Users.findOne({ email: req.body.email });
        if (user && _.get(user, 'email_verified_at', false) ? true : false) {
            return res.status(200).send(utils.apiResponseData(true, { is_exist: true }))
        } else {
            return res.status(200).send(utils.apiResponseData(true, { is_exist: false }))
        }
    } catch (error) {
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }

}

exports.login = async (req, res, next) => {
    try {

        // Check Exist Already
        let rules = {
            "wallet_address": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        // Find Wallet Address
        let wallet = await WalletAddresses.findOne({ wallet_address: req.body.wallet_address });
        let user;
        if (wallet) {
            user = await Users.findOne({ _id: ObjectId(wallet.user_id) });

            if (!user) {
                return res.status(200).send(utils.apiResponseMessage(false, "User not found."));
            }

        } else {
            user = new Users;
            await user.save();

            wallet = new WalletAddresses;
            wallet.wallet_address = req.body.wallet_address;
            wallet.user_id = user._id;
            await wallet.save();
        }

        let tokenDetails = {
            user_id: _.get(user, '_id', ""),
            wallet_address: req.body.wallet_address
        };

        const token = jwt.sign(tokenDetails,
            process.env.JWT_TOKEN_SECRET, {
            expiresIn: parseInt(config.JWT_TOKEN_EXPIRY),
        });

        res.status(200).json(utils.apiResponseData(true, {
            token,
            email: _.get(user, 'email', ""),
            is_verified: _.get(user, 'email_verified_at', false) ? true : false
        }));


    } catch (error) {
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }

}