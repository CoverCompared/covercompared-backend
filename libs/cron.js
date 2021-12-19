
const web3Connect = require("./web3");
var NodeCron = require('node-cron');


const web3Actions = async () => {
    try {
        console.log("Web3 Connect");
        let web3 = await web3Connect.connect()
        await web3Connect.p4lPolicySync();
    } catch (error) {
        /**
         * TODO: Send Error Report : issue wile run cron job
         */
    }
}

const cron = () => {
    web3Actions();
	console.log("Cron running a every 10 minute");
	NodeCron.schedule('*/10 * * * *', async () => {
        web3Actions();
	    console.log('running a every 10 minute', `${moment().format('LTS')}`);
	});

}


module.exports = { cron }