const niv = require("./../../libs/nivValidations");
const jwt = require('jsonwebtoken');
const _ = require("lodash");
const utils = require("../../libs/utils");
const config = require("../../config");

const mongoose = require("mongoose");
const { JWT_TOKEN_EXPIRY } = require("../../config/constants");
const Users = mongoose.model('Users');


exports.login = async (req, res, next) => {

    try {

        //check details 
        console.log(req.body);
        if (_.get(req.body, "email", false) && _.get(req.body, "password", false)) {
            //check if normal login 
            super_admin = await Users.findOne({email : req.body.email ,roles: { "$in": ["super-admin"] } });

            if(!super_admin){
                return res.status(422).send({ status:false , message:`Unauthorized.`});
            }else if(super_admin.status == false){
                return res.status(422).send({ status: false, message: `Your account is disable for now.` })
            }else if(!super_admin.authenticate(req.body.password)){
                return res.send(422).send({ status: false, message :`Password is not valid.` })
            }

            let tokenDetails = {
                user_id : _.get(super_admin, '_id' ,""),
                role : "super_admin"
            }

            const token = jwt.sign(tokenDetails,
                process.env.JWT_TOKEN_SECRET,{
                    expiresIn: parseInt(JWT_TOKEN_EXPIRY),
            });
            res.status(200).json({ status: true, token: token });

        }else{
            return res.status(422).send({ status: false , message: `Invalid request.` });
        }

    } catch (error) {
        console.log("error", error);
        // return res.send(500).send({ status: false , message: `wrong` });
        return res.status(error.statuscode || 500).json(utils.generateErrorResponse(error.statuscode || 500, (error && error.metadata) || {}, {}));
    }

}


