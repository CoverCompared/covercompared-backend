const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");
const ObjectId = require("mongodb").ObjectId;
const niv = require("./../libs/nivValidations");
const mailer = require("./../libs/mailer");

const mongoose = require("mongoose");
const constant = require("../libs/constants");
const Users = mongoose.model('Users');
const WalletAddresses = mongoose.model('WalletAddresses');
const ContactUsRequests = mongoose.model("ContactUsRequests");
const Subscriptions = mongoose.model("Subscriptions");
const Policies = mongoose.model("Policies");

exports.checkEmailExist = async (req, res, next) => {

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
            res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
            return;
        }

        // Find Wallet Address
        let user = await Users.getUser(req.body.wallet_address);
        if (!user) {
            return res.status(200).send(utils.apiResponseMessage(false, "User not found."));
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

exports.landingAppSubscribe = async (req, res, next) => {
    // Check Exist Already
    let rules = {
        "email": ["required", "email"]
    }

    let v = new niv.Validator(req.body, rules);
    let validation = await v.check();

    if (!validation) {
        let message = utils.getErrorMessage(v.errors);
        res.status(200).send(utils.apiResponse(false, message, {}, v.errors))
        return;
    }

    let subscription = await Subscriptions.findOne({ email: req.body.email });
    let isNew = false;
    
    if (subscription) {

        if (subscription.status != Subscriptions.STATUS.SUBSCRIBED) {
            isNew = true;
            subscription.unsubscribe_token = utils.random(60);
            subscription.status = Subscriptions.STATUS.SUBSCRIBED;
            subscription.status_history = Array.isArray(subscription.status_history) ? subscription.status_history : [];
            subscription.status_history.push({
                status: Subscriptions.STATUS.SUBSCRIBED,
                update_at: Date.now()
            })
            subscription.save();
        }

    } else {
        subscription = new Subscriptions;
        subscription.name = req.body.name;
        subscription.email = req.body.email;
        subscription.unsubscribe_token = utils.random(60);
        subscription.status = Subscriptions.STATUS.SUBSCRIBED;
        subscription.status_history.push({
            status: Subscriptions.STATUS.SUBSCRIBED,
            update_at: Date.now()
        })
        subscription.save();
        isNew = true;
    }

    // Send Mail
    console.log("Send mail ", isNew);
    if (isNew) {

        await mailer.landingAppSubscription(
            config.subscribe_mail,
            { email: req.body.email });
        
        await mailer.subscribe(
            [{ name: subscription.name, address: subscription.email }],
            {
                name: subscription.name ? subscription.name : subscription.email,
                unsubscribe_token: subscription.unsubscribe_token
            },
            []
        )
    }

    // if (response)
    if (subscription) {
        return res.send(utils.apiResponse(true, "Subscription added successfully", subscription))
    } else {
        return res.send(utils.apiResponseMessage(false, "Something went wrong."));
    }

}

exports.contactUs = async (req, res) => {

    // Validate All Details
    let rules = {
        name: ["required"],
        email: ["required", "email"],
        user_type: ["required"],
        message: ["required"],
    }

    let v = new niv.Validator(req.body, rules);
    let validation = await v.check();

    if (!validation) {
        res.status(200).send(utils.apiResponse(false, utils.getErrorMessage(v.errors), {}, v.errors))
        return;
    }

    // Store contact request to database
    let contactRequest = new ContactUsRequests;
    contactRequest.name = req.body.name;
    contactRequest.email = req.body.email;
    contactRequest.user_type = req.body.user_type;
    contactRequest.message = req.body.message;
    await contactRequest.save();

    // Send contact mail to support team
    let response = await mailer.sendContactUsMail({
        name: req.body.name,
        email: req.body.email,
        user_type: req.body.user_type,
        message: req.body.message
    });



    // Send response
    if (response)
        res.send(utils.apiResponseMessage(true, "Contact request submitted successfully."));
    else
        res.send(utils.apiResponseMessage(false, "Something went wrong."));

}