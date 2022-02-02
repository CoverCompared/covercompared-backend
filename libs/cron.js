
const web3Connect = require("./web3");
var NodeCron = require('node-cron');
const config = require("../config");


const web3Actions = async () => {
    try {
        console.log("Web3 Connect");
        let web3 = await web3Connect.connect();

        console.log("P4L Sync Started");
        if (!(process.env.P4L_SYNC_TRANSACTIONS_OFF && process.env.P4L_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.p4l.p4lPolicySync();
        console.log("MSO Sync Started");
        if (!(process.env.MSO_SYNC_TRANSACTIONS_OFF && process.env.MSO_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.mso.msoPolicySync();
        if (!(process.env.INSURACE_SYNC_TRANSACTIONS_OFF && process.env.INSURACE_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.insurace.policySync();
        if (!(process.env.NEXUS_SYNC_TRANSACTIONS_OFF && process.env.NEXUS_SYNC_TRANSACTIONS_OFF == "1")) await web3Connect.smart_contracts.nexus.policySync();
    } catch (error) {
        /**
         * TODO: Send Error Report : issue wile run cron job
         */
    }
}

const cron = async () => {

    await web3Connect.smart_contracts.p4l.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.mso.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.insurace.checkFromBlockAndSmartContractAddress();
    await web3Connect.smart_contracts.nexus.checkFromBlockAndSmartContractAddress();

    console.log("Check Smart Contract Address...");

    web3Actions();
    console.log("Cron running a every 30 minute");
    NodeCron.schedule('*/30 * * * *', async () => {
        web3Actions();
        console.log('running a every 10 minute', `${moment().format('LTS')}`);
    });

}


module.exports = { cron }