const niv = require("./../../libs/nivValidations");
const jwt = require('jsonwebtoken');
const _ = require("lodash");
const utils = require("../../libs/utils");
const config = require("../../config");

const mongoose = require("mongoose");
const { JWT_TOKEN_EXPIRY } = require("../../config/constants");
const { firebase_admin } = require("../../config/firebase");
const Users = mongoose.model('Users');


// exports.login = async (req, res, next) => {

//     try {

//         //check details 
//         console.log(req.body);
//         if (_.get(req.body, "email", false) && _.get(req.body, "password", false)) {
//             //check if normal login 
//             super_admin = await Users.findOne({email : req.body.email ,roles: { "$in": ["super-admin"] } });

//             if(!super_admin){
//                 return res.status(422).send({ status:false , message:`Unauthorized.`});
//             }else if(super_admin.status == false){
//                 return res.status(422).send({ status: false, message: `Your account is disable for now.` })
//             }else if(!super_admin.authenticate(req.body.password)){
//                 return res.send(422).send({ status: false, message :`Password is not valid.` })
//             }

//             let tokenDetails = {
//                 user_id : _.get(super_admin, '_id' ,""),
//                 role : "super_admin"
//             }

//             const token = jwt.sign(tokenDetails,
//                 process.env.JWT_TOKEN_SECRET,{
//                     expiresIn: parseInt(JWT_TOKEN_EXPIRY),
//             });
//             res.status(200).json({ status: true, token: token });

//         }else{
//             return res.status(422).send({ status: false , message: `Invalid request.` });
//         }

//     } catch (error) {
//         console.log("error", error);
//         // return res.send(500).send({ status: false , message: `wrong` });
//         return res.status(error.statuscode || 500).json(utils.generateErrorResponse(error.statuscode || 500, (error && error.metadata) || {}, {}));
//     }

// }

exports.login = async (req, res, next) => {

    try {

        // Validate request
        let rules = {
            "authToken": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, {}, v.errors))
            return;
        }

        let userInfo;
        try {
            userInfo = await firebase_admin.auth().verifyIdToken(req.body.authToken);

            // Find user email exist
            super_admin = await Users.findOne({ firebase_uid: userInfo.user_id, email: userInfo.email, roles: { "$in": ["super-admin"] } });

            if (!super_admin) {
                return res.status(200).send(utils.apiResponseMessage(false, "Unauthorized."));
            } else if (super_admin.status == false) {
                return res.status(200).send(utils.apiResponseMessage(false, "Your account is disable for now."))
            }

            // Generate token
            let tokenDetails = {
                user_id: _.get(super_admin, '_id', ""),
                role: "super-admin"
            };

            const token = jwt.sign(tokenDetails,
                process.env.JWT_TOKEN_SECRET, {
                expiresIn: parseInt(JWT_TOKEN_EXPIRY),
            });

            // Send response
            res.status(200).json(utils.apiResponseData(true, { token }));
        } catch (error) {
            res.status(200).json(utils.apiResponseMessage(false, "Invalid auth token."));
        }

    } catch (error) {
        return res.status(error.statuscode || 500).json(utils.generateErrorResponse(error.statuscode || 500, (error && error.metadata) || {}, {}));
    }

}

exports.changePassword = async (req, res, next) => {
    try {

        // Check current password is valid
        niv.extend('validate_password', async ({ value, args }) => {
            return new Promise((resolve, reject) => {
                if (req.user.authenticate(value)) {
                    resolve(true);
                } else {
                    reject(false);
                }
            })
        });


        // Validate request
        let rules = {
            "current_password": ["required"],
            "new_password": ["required", "min:8", "same:confirm_password"],
            "confirm_password": ["required"]
        }

        let v = new niv.Validator(req.body, rules);
        let validation = await v.check();

        if (!validation) {
            res.status(200).send(utils.apiResponseData(false, {}, v.errors))
            return;
        }

        req.user.password = req.body.password;
        await req.user.save();

        // Send response
        res.send(utils.apiResponseMessage(true, "Password updated successfully."));

    } catch (error) {
        return res.status(error.statuscode || 500).json(utils.generateErrorResponse(error.statuscode || 500, (error && error.metadata) || {}, {}));
    }
}

exports.profile = async (req, res, next) => {
    res.send(utils.apiResponseData(true, {
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email
    }))
}
