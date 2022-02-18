'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * ErrorReports Schema
 */
const ErrorReportsSchema = new Schema({
    type: { type: String, default: null },
    message: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },
    review_done: { type: Boolean, default: false },
}, { timestamps: true });

mongoose.model('ErrorReports', ErrorReportsSchema, "error_reports");
