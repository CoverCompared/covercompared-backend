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

exports.store = async (req, res, next) => {

    try {

        // Check Exist Already
        let rules = {
            "rating": ["required", "numeric", "between:0,1"],
            "review": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, v.errors))
            return;
        }

        // // Find Email Exist
        // let walletAddress = await WalletAddresses.findOne({ wallet_address: req.body.wallet_address });

        // if(walletAddress && walletAddress.user_id.toString() != req.user._id.toString()){
        //     return res.status(200).send(utils.apiResponseMessage(false, "Wallet Address is already attached with another user."));
        // }

        // if(!walletAddress){

        //     wallet = new WalletAddresses;
        //     wallet.wallet_address = req.body.wallet_address;
        //     wallet.user_id = req.user._id;
        //     await wallet.save();

        // }

        // return res.status(200).send(utils.apiResponseMessage(true, "Wallet Address added successfully."));
        
        

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}