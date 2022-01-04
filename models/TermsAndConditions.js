'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Users Schema
 */

const TermsAndConditionsSchema = new Schema({
    unique_ids: [{ type: String, default: null }],
    terms_and_conditions: { type: String, default: null },
    pdf: { type: String, default: null }
}, {
    timestamps: true
});

mongoose.model('TermsAndConditions', TermsAndConditionsSchema, "termsandconditions");
