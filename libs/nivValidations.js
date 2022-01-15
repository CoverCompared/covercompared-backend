const niv = require("node-input-validator");
const mongoose = require('mongoose');

niv.extend('ObjectId', async ({ value, args }) => {
    return mongoose.isValidObjectId(value)
});

module.exports = niv;