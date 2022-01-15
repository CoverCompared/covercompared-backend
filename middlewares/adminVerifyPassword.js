const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Users = mongoose.model('Users');



module.exports = async function (req, res, next) {
    const token = req.header("auth-token");
    if (!token) {
        return res.status(401).json({ status: false, message: "Unauthorized." });
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
        let user = await Users.findOne({ _id: verified.user_id })
        if (verified.role == "super-admin" && user && user.status == true) {
            req.user = user;
            next();
        } else {
            return res.status(401).json({ status: false, message: "Unauthorized." });
        }
    } catch (error) {
        if(error instanceof jwt.TokenExpiredError){
            return res.status(401).json({ status: false, message: "Unauthorized." });
        }
        return res.status(500).json({ status: false });
    }
};