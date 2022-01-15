'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * SmartContractLogos Schema
 */

const SmartContractLogosSchema = new Schema({
    company_code: { type: String, default: null },
    unique_id: { type: String, default: null },
    use_default: { type: Boolean, default: null },
    logo_details: { type: Schema.Types.Mixed, default: null }
}, { timestamps: true });

mongoose.model("SmartContractLogos", SmartContractLogosSchema, "smartcontractlogos");