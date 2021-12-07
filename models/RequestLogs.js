'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Users Schema
 */

const RequestLogsSchema = new Schema({
    method: { type: Schema.Types.Mixed, default: null },
    content_type: { type: Schema.Types.Mixed, default: null },
    header_auth: { type: Schema.Types.Mixed, default: null },
    url: { type: Schema.Types.Mixed, default: null },
    request_body: { type: Schema.Types.Mixed, default: null },
    response_body: { type: Schema.Types.Mixed, default: null },
}, {
    timestamps: true
});

mongoose.model('RequestLogs', RequestLogsSchema, "requestlogs");
