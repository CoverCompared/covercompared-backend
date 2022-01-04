const niv = require("./../../libs/nivValidations");

const mongoose = require('mongoose');
const utils = require("../../libs/utils");
const TermsAndConditions = mongoose.model('TermsAndConditions');

exports.store = async (req, res, next) => {

    let rules = {
        'unique_ids': ['required', "array"],
        'unique_ids.0': ['required', "string"],
        'terms_and_conditions': ['required'],
        'pdf': ['required'],
    };

    let v = new niv.Validator(req.body, rules); v.check().then((matched) => {
        if (!matched) {
            return res.status(200).send(utils.apiResponseData(false, v.errors));
        } 
    });

    // Create new Blogs
    let tc = new TermsAndConditions;
    tc.unique_ids = req.body.unique_ids;
    tc.terms_and_conditions = req.body.terms_and_conditions;
    tc.pdf = req.body.pdf;
    await tc.save();

    return res.send(utils.apiResponse(true, "Terms and Conditions added successfully.", tc))

}