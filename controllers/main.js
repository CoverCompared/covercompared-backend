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
            res.status(200).send(utils.apiResponseData(false, {}, v.errors))
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
            res.status(200).send(utils.apiResponseData(false, {}, v.errors))
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

    let response = await mailer.landingAppSubscription(
        config.subscribe_mail,
        { email: req.body.email });

    let find = await Subscriptions.find({ email: req.body.email });
    if (find == "") {
        var subscription = new Subscriptions;
        subscription.name = req.body.name;
        subscription.email = req.body.email;
        await subscription.save();
        // console.log(subscription);
    }
    else {
        return res.send(utils.apiResponseMessage(false, "Email already exists"));
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
        res.status(200).send(utils.apiResponseData(false, {}, v.errors))
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

exports.resetSmartContract = async (req, res) => {
    let policies = await Policies.find({ product_type : { "$in": [constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange] } })

    if(policies && policies.length){
        for (const key in policies) {
            if(policies[key].product_type == constant.ProductTypes.crypto_exchange && (policies[key].CryptoExchange.type == "protocol" || policies[key].SmartContract.type == "protocol")){
                policies[key].txn_hash = "SC-" + policies[key].txn_hash.split("-")[1]
                policies[key].product_type = constant.ProductTypes.smart_contract;
                if(policies[key].CryptoExchange.type == "protocol"){
                    policies[key].SmartContract = policies[key].CryptoExchange;
                }
                await policies[key].save();
            }else if(policies[key].product_type == constant.ProductTypes.smart_contract && (policies[key].SmartContract.type == "custodian" || policies[key].CryptoExchange.type == "custodian")){
                policies[key].txn_hash = "CE-" + policies[key].txn_hash.split("-")[1]
                policies[key].product_type = constant.ProductTypes.crypto_exchange;
                if(policies[key].SmartContract.type == "custodian"){
                    policies[key].CryptoExchange = policies[key].SmartContract;
                }
                await policies[key].save();
            }
        }
    }

    res.send({values: policies})
}