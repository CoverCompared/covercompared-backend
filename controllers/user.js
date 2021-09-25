const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Users = mongoose.model('Users');
const WalletAddresses = mongoose.model('WalletAddresses');
const UnverifiedEmails = mongoose.model('UnverifiedEmails');
const niv = require("./../libs/nivValidations");
const mailer = require("../libs/mailer");
const moment = require("moment");

exports.addProfileDetails = async (req, res, next) => {

    try {
        // Check Exist Already
        let rules = {
            "first_name": ["required"],
            "last_name": ["required"],
            "email": ["nullable", "email"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }
        let otp;
        // Find Email Exist
        let user = await Users.findOne({ _id: req.user._id });
        user.first_name = req.body.first_name;
        user.last_name = req.body.last_name;
        if (req.body.email) {
            if (user.email != req.body.email) {
                let unverifiedEmail = await UnverifiedEmails.findOne({ user_id: req.user._id, email: req.body.email, email_verified_at: null });

                if (!unverifiedEmail) {
                    unverifiedEmail = new UnverifiedEmails;
                    unverifiedEmail.user_id = user._id;
                    unverifiedEmail.email = req.body.email;
                }
                
                unverifiedEmail.otp = utils.getEmailOtp();
                unverifiedEmail.otp_send_at = new Date(moment());
                await unverifiedEmail.save();

                await mailer.emailVerification(
                    req.body.email,
                    {
                        email: req.body.email,
                        otp: unverifiedEmail.otp
                    })
                otp = unverifiedEmail.otp
            }
        }
        await user.save();

        let data = {};

        if (process.env.NODE_ENV == "local" || process.env.NODE_ENV == "staging") {
            data['otp'] = otp
        }

        return res.status(200).send(utils.apiResponse(true, "Details added successfully.", data));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.resendVerificationEmail = async (req, res, next) => {

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
        let unverifiedEmail = await UnverifiedEmails.findOne({ user_id: req.user._id, email: req.body.email, email_verified_at: null });
        if (unverifiedEmail) {
            unverifiedEmail.otp = utils.getEmailOtp();
            unverifiedEmail.otp_send_at = new Date(moment());
            await unverifiedEmail.save();

            await mailer.emailVerification(
                req.body.email,
                {
                    email: req.body.email,
                    otp: unverifiedEmail.otp
                })
            let data = {};
            if (process.env.NODE_ENV == "local" || process.env.NODE_ENV == "staging") {
                data['otp'] = unverifiedEmail.otp
            }
            return res.status(200).send(utils.apiResponse(true, "Email sent successfully.", data));
        } else {
            return res.status(200).send(utils.apiResponseMessage(true, "Invalid Request Email."));
        }

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.verifyOtp = async (req, res, next) => {

    try {
        // Check Exist Already
        let rules = {
            "otp": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        // Find Email Exist
        let unverifiedEmail = await UnverifiedEmails.findOne({ user_id: req.user._id, otp: req.body.otp });
        if (unverifiedEmail) {

            let sent_after = moment().subtract(6, 'minute');
            if(moment(unverifiedEmail.otp_send_at) >= sent_after){

                req.user.email_verified_at  = new Date(moment());
                req.user.email = unverifiedEmail.email;
                await req.user.save();
                
                unverifiedEmail.email_verified_at = new Date(moment());
                unverifiedEmail.otp = null;
                unverifiedEmail.otp_send_at = null;
                await unverifiedEmail.save();
                return res.status(200).send(utils.apiResponseMessage(true, "Verified successfully."));
            }else{
                await UnverifiedEmails.findOneAndDelete({ _id: unverifiedEmail._id });
                return res.status(200).send(utils.apiResponseMessage(false, "OTP is Expired."));
            }

        }

        return res.status(200).send(utils.apiResponseMessage(false, "Invalid OTP."));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.profile = async (req, res, next) => {

    try {
        // Find Email Exist
        let walletAddress = await WalletAddresses.find({ user_id: req.user._id });
        if(walletAddress && walletAddress.length){
            walletAddress = walletAddress.map(address => address.wallet_address);
        }
        let response = {
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            is_verified: _.get(req.user, "email_verified_at", false) ? true : false,
            wallet_addresses: walletAddress,
        }
        return res.status(200).send(utils.apiResponseData(true, response));

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.addWalletAddress = async (req, res, next) => {

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

        // Find Email Exist
        let walletAddress = await WalletAddresses.findOne({ wallet_address: req.body.wallet_address });

        if(walletAddress && walletAddress.user_id.toString() != req.user._id.toString()){
            return res.status(200).send(utils.apiResponseMessage(false, "Wallet Address is already attached with another user."));
        }

        if(!walletAddress){

            wallet = new WalletAddresses;
            wallet.wallet_address = req.body.wallet_address;
            wallet.user_id = req.user._id;
            await wallet.save();

        }

        return res.status(200).send(utils.apiResponseMessage(true, "Wallet Address added successfully."));
        
        

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}


