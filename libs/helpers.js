const mongoose = require('mongoose');
const config = require('../config');
const mailer = require('./mailer');

let helpers = {};

/**
 * 
 * @param {"issue"|"warning"} type 
 * @param {String} message 
 * @param {Object} data 
 */
helpers.addErrorReport = async (type, message, data, send_mail = true) => {
    const ErrorReports = mongoose.model('ErrorReports');

    // Add Report in collection
    let report = new ErrorReports;
    report.type = type;
    report.message = message;
    report.data = data;
    report.save();

    // Send Mail if type is issue
    if(type == "issue" && send_mail){
        if(config.developer_mail){
            await mailer.sendErrorReportMail({ type, message, data: JSON.stringify(data) })
        }
    }
    
}

module.exports = helpers;
