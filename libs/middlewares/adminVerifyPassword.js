const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const utils = require("../utils");
const Users = mongoose.model('Users');



module.exports = async function (req, res, next) {
    const token = req.header("Authorization");
    if (!token) {
        return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
        let user = await Users.findOne({ _id: verified.user_id })
        if (verified.role == "super-admin" && user && user.status == true) {
            req.user = user;
            next();
        } else {
            return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
        }
    } catch (error) {
        if (
            error instanceof jwt.TokenExpiredError ||
            error instanceof jwt.JsonWebTokenError
        ) {
            return res.status(401).json(utils.apiResponseMessage(false, "Unauthorized."));
        }
        return res.status(500).json({ status: false });
    }
};