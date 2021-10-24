const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const jwt = require('jsonwebtoken');
const config = require("../config");

const mongoose = require("mongoose");
const Users = mongoose.model('Users');
const Reviews = mongoose.model('Reviews');
const UnverifiedEmails = mongoose.model('UnverifiedEmails');
const niv = require("./../libs/nivValidations");
const mailer = require("../libs/mailer");
const moment = require("moment");
const { request } = require("express");

exports.get = async (req, res, next) => {
    
    try {
        let reviews = [];
       
        if(req.query.product_type){
            var product_type = req.query.product_type;
            let policy = await Policies.find({ product_type: product_type });
            if(product_type == "mso_policy")
            {
                let mso;
                if(req.query.plan_type){
                    var plan_type = req.query.plan_type;
                    mso = await MSOPolicies.find({ plan_type : plan_type });
                    
                }else{
                    mso = await MSOPolicies.find();
                }
                console.log(mso);
            }else{
                let device_insurance = await DeviceInsurance.find();
                console.log(device_insurance);
            }
            

        }else{
             reviews = await Reviews.find();
    
        }
        if(reviews)
        {
            
        }

        
        return res.status(200).send(utils.apiResponseData(true, reviews));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

