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

exports.addProfileDetails = async (req, res, next) => {

    res.send({status :  true})

}