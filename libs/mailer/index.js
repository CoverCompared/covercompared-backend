const nodemailer = require("nodemailer");
let aws = require("@aws-sdk/client-ses");
const ejs = require("ejs");
const config = require("../../config");
const utils = require("../utils");

let mailer = {};
if (process.env.MAIL_SERVICE == "aws") {
    mailer.sendMail = (to, subject, html, attachments = []) => {
        return new Promise((resolve) => {

            // configure AWS SDK
            process.env.AWS_ACCESS_KEY_ID = process.env.MAIL_USERNAME;
            process.env.AWS_SECRET_ACCESS_KEY = process.env.MAIL_PASSWORD;
            const ses = new aws.SES({
                apiVersion: "2010-12-01",
                region: "eu-west-1"
            });
            console.log("ses", ses);
            // create Nodemailer SES transporter
            let transporter = nodemailer.createTransport({
                SES: { ses, aws },
            });

            // Mail Options
            const options = {
                from: `"Cover Compared" no-replay@polkacover.com`,
                to,
                subject,
                html
            }

            try {
                // Sending Mail
                transporter.sendMail(options, (mErr, mRes) => {
                    console.log("ERROR", mErr, mRes);
                    if (mErr)
                        resolve(false);
                    else
                        resolve(true);
                });
            } catch (error) {
                console.log(error);
            }

        })
    }
} else {
    mailer.sendMail = (to, subject, html, attachments) => {

        return new Promise((resolve) => {

            // Creating Transport
            // const transport = nodemailer.createTransport({
            //     service: "gmail",
            //     auth: {
            //         user: '',
            //         pass: ""
            //     }
            // });
            const transport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                auth: {
                    user: process.env.MAIL_USERNAME,
                    pass: process.env.MAIL_PASSWORD
                },
                tls: {
                    ciphers: 'SSLv3'
                }
            });

            // Mail Options
            const options = {
                from: `"Cover Compared" no-replay@polkacover.com`,
                to,
                subject,
                html,
                attachments
            }

            // Sending Mail
            transport.sendMail(options, (mErr, mRes) => {
                console.log(mErr);
                if (mErr)
                    resolve(false);
                else
                    resolve(true);
            });

        })
    }
}

/**
 * 
 * @param {string} to 
 * @param {Object} data 
 * @param {string} data.email 
 * @param {string} data.otp 
 * @param {Array} attachments 
 */
mailer.emailVerification = async (to, data, attachments = []) => {

    data = { ...data, config: config }
    const html = await ejs.renderFile(__dirname + "/templates/email-verification.ejs", data);
    const subject = "Email verification.";

    return mailer
        .sendMail(to, subject, html, attachments);
}


module.exports = mailer;