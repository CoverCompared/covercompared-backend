const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const utils = require("../libs/utils");
const Users = mongoose.model('Users');



module.exports = async function (req, res, next) {
    const token = req.header("Authorization");
    if (!token) {
        return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
        let user = await Users.findOne({ _id: verified.user_id })
        if (user) {
            req.user = user;
            next();
        } else {
            return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
        }
    } catch (error) {
        console.log("ERR", error);
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
        }
        return res.status(500).json({ status: false });
    }
};