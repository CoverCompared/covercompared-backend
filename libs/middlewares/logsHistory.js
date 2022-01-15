const mongoose = require("mongoose");
const RequestLogs = mongoose.model('RequestLogs');

const _ = require('lodash');

module.exports = async (req, res, next) => {
    var oldWrite = res.write,
        oldEnd = res.end;
    var chunks = [];

    res.write = function (chunk) {
        chunks.push(chunk);
        return oldWrite.apply(res, arguments);
    };

    res.end = async function (chunk) {
        if (chunk)
            chunks.push(chunk);

        var body = Buffer.concat(chunks).toString('utf8');
        try {
            let request_obj = new RequestLogs;
            request_obj.method = req.method;
            request_obj.content_type = req.headers['content-type'];
            request_obj.header_auth = req.header("Authorization");
            request_obj.url = req.url;
            request_obj.request_body = req.body;
            request_obj.response_body = body;
            request_obj.save();
        } catch (error) {

        }
        oldEnd.apply(res, arguments);
    };
    next();
}