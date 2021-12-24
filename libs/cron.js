
const web3Connect = require("./web3");
var NodeCron = require('node-cron');


const web3Actions = async () => {
    try {
        console.log("Web3 Connect");
        let web3 = await web3Connect.connect()
        // await web3Connect.smart_contracts.p4l.p4lPolicySync();
        await web3Connect.smart_contracts.mso.msoPolicySync();
    } catch (error) {
        /**
         * TODO: Send Error Report : issue wile run cron job
         */
    }
}

const cron = () => {
    web3Actions();
	console.log("Cron running a every 30 minute");
	NodeCron.schedule('*/30 * * * *', async () => {
        web3Actions();
	    console.log('running a every 10 minute', `${moment().format('LTS')}`);
	});

}


module.exports = { cron }