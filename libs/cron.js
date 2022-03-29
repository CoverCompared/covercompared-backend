
const web3Connect = require("./web3");
var NodeCron = require('node-cron');
const config = require("../config");
const helpers = require("./helpers");
const moment = require('moment');


const web3Actions = async () => {
    try {
        console.log("Web3 Connect");
        let web3 = await web3Connect.connect();

        if (!(process.env.MSO_SYNC_TRANSACTIONS_OFF && process.env.MSO_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.mso.msoPolicySync();
        else console.log("MSO  WEB3 Sync Is Off");

        if (!(process.env.P4L_SYNC_TRANSACTIONS_OFF && process.env.P4L_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.p4l.p4lPolicySync();
        else console.log("P4L  WEB3 Sync Is Off");

        if (!(process.env.INSURACE_SYNC_TRANSACTIONS_OFF && process.env.INSURACE_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.insurace.policySync();
        else console.log("INSURACE  WEB3 Sync Is Off");

        if (!(process.env.NEXUS_SYNC_TRANSACTIONS_OFF && process.env.NEXUS_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.nexus.policySync();
        else console.log("NEXUS  WEB3 Sync Is Off");

    } catch (error) {
        /**
         * Send Error Report : issue wile run cron job
         */
        await helpers.addErrorReport(
            "issue", 
            "Issue while run cron job", 
            { errorNote: error.toString(), error }
        )
    }
}

const cron = async () => {

    await web3Connect.smart_contracts.p4l.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.mso.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.insurace.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.nexus.checkFromBlockAndSmartContractAddress();

    console.log("Check Smart Contract Address...");

    web3Actions();
    
    NodeCron.schedule('*/2 * * * * *', async () => {
        console.log("TEST Working", moment().format("HH:mm:ss"));
    })
    
    console.log("Cron running a every 30 minute");
    NodeCron.schedule('*/30 * * * *', async () => {
        try {
            console.log('running a every 10 minute', `${moment().format('LTS')}`);
            web3Actions();
        } catch (error) {
            console.log("Cron ERROR", error);
        }
    });

}


module.exports = { cron }