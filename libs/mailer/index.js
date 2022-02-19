const nodemailer = require("nodemailer");
let aws = require("@aws-sdk/client-ses");
const ejs = require("ejs");
const config = require("../../config");
const utils = require("../utils");

let mailer = {};
mailer.sendMail = (to, subject, html, attachments = []) => {
    return new Promise(async (resolve) => {

        /**If send mail is disable then it will skip the mail */
        if (!config.send_mail) {
            resolve(true);
            return;
        }

        if (process.env.MAIL_SERVICE == "aws") {
            // Creating Transport
            // const transport = nodemailer.createTransport({
            //     service: "gmail",
            //     auth: {
            //         user: '',
            //         pass: ""
            //     }
            // });
            // const transport = nodemailer.createTransport({
            //     host: process.env.MAIL_HOST,
            //     port: process.env.MAIL_PORT,
            //     auth: {
            //         user: process.env.MAIL_USERNAME,
            //         pass: process.env.MAIL_PASSWORD
            //     },
            //     tls: {
            //         ciphers: 'SSLv3'
            //     }
            // });

            // configure AWS SDK
            process.env.AWS_ACCESS_KEY_ID = process.env.MAIL_USERNAME;
            process.env.AWS_SECRET_ACCESS_KEY = process.env.MAIL_PASSWORD;
            const ses = new aws.SES({
                apiVersion: "2010-12-01",
                region: process.env.AWS_REGION ? process.env.AWS_REGION : "eu-west-1",
            });

            // create Nodemailer SES transporter
            let transporter = nodemailer.createTransport({
                SES: { ses, aws },
            });

            // Mail Options
            const options = {
                from: config.noreplay,
                to,
                subject,
                html,
                attachments
            }

            try {
                // Sending Mail
                transporter.sendMail(options, async (mErr, mRes) => {
                    console.log(mErr, mRes);
                    if (mErr) {
                        /**
                         * Send Error Report 
                         */
                        await utils.addErrorReport(
                            "issue", 
                            "Issue on sending mail", 
                            { to, errorNote: mErr.toString(), mErr }, false
                        )
                        resolve(false);
                    } else { resolve(true); }
                });
            } catch (error) {
                /**
                 * Send Error Report 
                 */
                await utils.addErrorReport(
                    "issue", 
                    "Issue on sending mail", 
                    { errorNote: error.toString(), error }, false
                )
                console.log(error);
            }
        } else {
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
                from: config.noreplay,
                to,
                subject,
                html,
                attachments
            }

            // Sending Mail
            transport.sendMail(options, async (mErr, mRes) => {
                console.log(mErr);
                if (mErr) {
                    /**
                     * Send Error Report 
                     */
                    await utils.addErrorReport(
                        "issue", 
                        "Issue on sending mail", 
                        { to, errorNote: mErr.toString(), mErr }, false
                    )
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
        }

    })

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

/**
 * 
 * @param {string} to 
 * @param {Object} data 
 * @param {string} data.email 
 */
mailer.landingAppSubscription = async (to, data, attachments = []) => {

    data = { ...data, config: config }
    const html = await ejs.renderFile(__dirname + "/templates/landing-app-subscription.ejs", data);
    const subject = "Enquiry @ polkacover.";

    return mailer
        .sendMail(to, subject, html, attachments);
}


/**
 * 
 * @param {Object} to 
 * @param {string} to[].name 
 * @param {string} to[].address 
 * @param {Object} data 
 * @param {string} data.name 
 * @param {string} data.unsubscribe_token 
 * @param {Array} attachments 
 */
mailer.subscribe = async (to, data, attachments) => {

    data = { ...data, config: config }
    const html = await ejs.renderFile(__dirname + "/templates/subscribe.ejs", data);
    const subject = "Welcome to Cover Compared, Thank for Subscription";

    attachments = mailer.attachTemplateFiles(attachments);

    return mailer
        .sendMail(to, subject, html, attachments);
}

mailer.attachTemplateFiles = (attachments = []) => {
    attachments.push({
        filename: 'logo.png',
        path: `${__dirname}/../../public/images/cover-compared.png`,
        cid: 'covercomparedlogo@cid'
    })
    attachments.push({
        filename: 'twitter.png',
        path: `${__dirname}/../../public/images/twitter.png`,
        cid: 'covercomparedtwitter@cid'
    })
    attachments.push({
        filename: 'linkedin.png',
        path: `${__dirname}/../../public/images/linkedin.png`,
        cid: 'covercomparedlinkedin@cid'
    })
    attachments.push({
        filename: 'telegram.png',
        path: `${__dirname}/../../public/images/telegram.png`,
        cid: 'covercomparedtelegram@cid'
    })
    attachments.push({
        filename: 'gitbook.png',
        path: `${__dirname}/../../public/images/gitbook.png`,
        cid: 'covercomparedgitbook@cid'
    })
    return attachments;
}


/**
 * 
 * It will send mail to support team.
 * 
 * @param {Object} data
 * @param {String} data.name  
 * @param {String} data.email
 * @param {String} data.user_type
 * @param {String} data.message
 * 
 * @returns 
 */
mailer.sendContactUsMail = async (data) => {
    data = { ...data, config: config };
    const html = await ejs.renderFile(__dirname + "/templates/contact-us.ejs", data);
    const subject = "Contact Us Enquiry @ polkacover. ";

    return mailer.sendMail(config.subscribe_mail, subject, html);
}

/**
 * 
 * It will send mail if generate any error in project.
 * 
 * @param {Object} data
 * @param {String} data.message  
 * @param {String} data.data
 * 
 * @returns 
 */
mailer.sendErrorReportMail = async (data) => {
    data = { ...data, config: config };
    const html = await ejs.renderFile(__dirname + "/templates/error-report.ejs", data);
    const subject = `Error Report ${config.app_code} - ${config.env}: ${data.message}`;

    return mailer.sendMail(config.developer_mail, subject, html);
}

module.exports = mailer;