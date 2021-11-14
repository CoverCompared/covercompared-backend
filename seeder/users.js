const mongoose = require('mongoose');
const config = require('../config');
const Users = mongoose.model('Users');
const { firebase_admin } = require("../config/firebase");

module.exports = async () => {

    let super_admin_firebase_uids = [];
    if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
        super_admin_firebase_uids.push("dYGraCTsNOYbR8f2ot32pUGymIG2");
    } else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
        super_admin_firebase_uids.push("7Q0cLEMxp6WE7HrHwaL8RR18MAx1");
    } else {
        super_admin_firebase_uids.push("xRDL5ZYHDaPBEcqYv2OKioovltN2");
    }

    if (super_admin_firebase_uids) {


        let users = super_admin_firebase_uids;
        let user;
        for (const key in users) {
            try {
                let firebaseUser = await firebase_admin.auth().getUser(users[key]);
                if (firebaseUser) {
                    user = await Users.findOne({ firebase_uid: users[key] });
                    user = !user ? new Users(): user;
                    user.email = firebaseUser.email;
                    user.firebase_uid = users[key];
                    user.status = true;
                    user.email_verified_at = new Date();
                    user.roles = ["super-admin"]
                    user = await user.save();
                }
            } catch (error) { }

        }
    }
    return true;
}