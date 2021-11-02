const mongoose = require('mongoose');
const config = require('../config');
const Users = mongoose.model('Users');

module.exports = async () => {

    if (config.super_admin_firebase_uids) {
        let users = config.super_admin_firebase_uids;
        let user;
        for (const key in users) {
            user = await Users.findOne({ firebase_uid: users[key] });
            if (!user) {
                user = new Users();
                user.firebase_uid = users[key];
                user.status = true;
                user.roles = ["super-admin"]
                user = await user.save();
            }
        }
    }

    let superadminEmail = "superadmin@cover-compared.com";
    if(process.env.NODE_ENV == "local"){
        superadminEmail = "superadmin@cover-compared-local.com";
    }

    user = await Users.findOne({ email: superadminEmail });
    if (!user) {
        user = new Users();
        user.email = superadminEmail;
        user.password = "123456";
        user.status = true;
        user.roles = ["super-admin"]
        user = await user.save();
    }

    return true;
}