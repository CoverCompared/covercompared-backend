const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");
const config_companies = require("../config/companies");

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
            "first_name": ["nullable"],
            "last_name": ["nullable"],
            "email": ["nullable", "email"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
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
            _id: req.user._id,
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
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
            return;
        }

        // Find Email Exist
        let walletAddress = await WalletAddresses.findOne({ wallet_address: utils.getWalletAddressMatch(req.body.wallet_address) });

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

exports.addCartItems = async (req, res, next) => {

    // Check Exist Already
    let rules = {
        "cart_items": ["nullable", "array"]
    }
    
    let v = new niv.Validator(req.body, rules);
    let validation = await v.check();
    
    if (!validation) {
        res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
        return;
    }
    try {
        let user = await Users.findOne({ _id: req.user._id });
        user.cart_items = req.body.cart_items;
        await user.save();

        return res.status(200).send(utils.apiResponse(true, "Cart items added successfully.", user.cart_items));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.getCartItems = async (req, res, next) => {

    try {
        let user = await Users.findOne({ _id: req.user._id });
        return res.status(200).send(utils.apiResponseData(true, _.get(user, "cart_items", [])));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.coverQuote = async (req, res, next) => {
    let rules = {
        'company': ['required', `in:${companies.getCompanyCodes().join(",")}`],
        'address': ["required"],
    };

    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
        if (!matched) {
            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
        } else {
            let cover = await companies.coverCapacity(req.body.company, req.body.address, _.get(req.body, "product_id", false));
            if (cover) {

                if (req.body.company == config_companies.nexus.code) {

                    let rules = {
                        'currency': ["required", "in:ETH,DAI"],
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
                        } else {
                            let cover = await companies.companies.nexus.getQuote(req.body.address, req.body.coverAmount, req.body.currency, req.body.period, false)
                            res.send(utils.apiResponseData(cover.status, cover.data))
                        }
                    });

                } else if (req.body.company == config_companies.insurace.code) {
                    let rules = {
                        'currency': ["required"],
                        'owner_id': ["required"],
                        'supported_chain': ["nullable"],
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                        'product_id': ["required"]
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
                        } else {
                            let quote = await companies.companies.insurace.getQuote(
                                {
                                    product_id: cover.product_id,
                                    address: cover.address,
                                    amount: req.body.coverAmount,
                                    period: req.body.period,
                                    currency: req.body.currency,
                                    owner_id: req.body.owner_id,
                                    supported_chain: req.body.supported_chain ? req.body.supported_chain : "Ethereum"
                                }, false)
                            res.send(utils.apiResponseData(quote.status, quote.data))
                        }
                    });
                } else if (req.body.company == config_companies.nsure.code) {
                    let rules = {
                        'coverAmount': ["required", "integer"],
                        'period': ["required", `min:${cover.duration_days_min}`, `max:${cover.duration_days_max}`],
                    };

                    let v = new niv.Validator(req.body, rules); v.check().then(async (matched) => {
                        if (!matched) {
                            res.status(422).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
                        } else {
                            let quote = await companies.companies.nsure.getQuote(cover.uid,
                                utils.convertToCurrency(req.body.coverAmount, 18),
                                req.body.period)
                            res.send(utils.apiResponseData(quote.status, quote.data))
                        }
                    });


                } else {
                    res.send(utils.apiResponseMessage(false, 'something-went-wrong'))
                }
            } else {
                res.send(utils.apiResponseMessage(false, "Product not found."))
            }


        }
    });
}