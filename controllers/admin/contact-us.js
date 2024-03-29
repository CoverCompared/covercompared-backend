const niv = require("./../../libs/nivValidations");
const utils = require("../../libs/utils");
const _ = require("lodash");

const mongoose = require('mongoose');
const ContactUsRequests = mongoose.model('ContactUsRequests');


exports.table = async (req, res, next) => {

    let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
    const sort = JSON.parse(_.get(req.query, "sort", '["_id", "desc"]'));
    const skip = parseInt(range[0]);
    const limit = parseInt(range[1]) - skip;
    let findObj = {};
    const search = JSON.parse(_.get(req.query, "filter", "{}"));

    if (search) {
        findObj["$and"] = [];
        if (search.email) {
            findObj["$and"].push({ email: { $regex: search.email, $options: "i" } });
        }

        if(search.q){
            findObj["$or"] = [
                { email: { $regex: search.q, $options: "i" } },
                { name: {$regex: search.q, $options: "i"} }
            ]
        }
    }

    if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

    if (sort[0] == "id") { sort[0] = "_id" }

    let total = await ContactUsRequests.aggregate([{ $match: findObj }, { $count: 'total' }]);
    let contact_us = await ContactUsRequests.find(findObj)
        .sort({ [sort[0]]: sort[1] })
        .limit(limit)
        .skip(skip).lean();

    res.send(utils.apiResponseData(true, {
        range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
        data: contact_us
    }))

}

exports.show = async (req, res, next) => {

    try {
        let contact = await ContactUsRequests.findOne({ _id: req.params.id });
        if (!contact) {
            return res.status(200).send(utils.apiResponseMessage(false, "Contact-Request not found."));
        }

        return res.status(200).send(utils.apiResponseData(true, contact));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }

}

exports.markRead = async (req, res, next) => {
    try {
        let contact = await ContactUsRequests.findOne({ _id: req.params.id });
        if (!contact) {
            return res.status(200).send(utils.apiResponseMessage(false, "Contact-Request not found."));
        }

        contact.mark_read = req.params.mark_read == "1" ? true : false;
        await contact.save();

        let msg = contact.mark_read ? "read" : "unread";
        return res.status(200).send(utils.apiResponseMessage(true, `Mark as ${msg} successfully.`));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}