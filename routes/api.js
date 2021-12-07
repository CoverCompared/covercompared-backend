var express = require('express');
var router = express.Router();
const _ = require('lodash');

const coverController = require("./../controllers/covers");
const msoController = require("./../controllers/mso");
const p4lController = require("./../controllers/p4l");
const mainController = require("./../controllers/main");
const userController = require("./../controllers/user");
const reviewController = require("./../controllers/review");
const policyRequestController = require("./../controllers/policy-requests");
const policiesController = require("./../controllers/policies");
const blogController = require("../controllers/blogs");
const authVerify = require('../middlewares/authVerify');
const authVerifyIfExist = require('../middlewares/authVerifyIfExist');
const logsHistory = require('../libs/middlewares/logsHistory');

const mongoose = require("mongoose");
const RequestLogs = mongoose.model('RequestLogs');

var express1 = require('express');
var apiRoutes = express1.Router();

apiRoutes.get('/cover-list', coverController.list);
apiRoutes.get('/cover-options', coverController.options);
apiRoutes.post('/cover-capacity',  coverController.capacity);
apiRoutes.post('/cover-quote', coverController.quote);
apiRoutes.post('/company/insurace/confirm-premium',  coverController.insuracAceConfirmPremium);
apiRoutes.post('/cover-min-quote', coverController.minQuote);

apiRoutes.get('/mso-list', msoController.list);
apiRoutes.post('/p4l-forward', p4lController.forward);

apiRoutes.post('/check-email-exist', logsHistory, mainController.checkEmailExist);
apiRoutes.post('/login', logsHistory, mainController.login);
apiRoutes.post('/landing-app-subscribe', logsHistory, mainController.landingAppSubscribe);

apiRoutes.get('/blogs/image/:slug', blogController.image);
apiRoutes.get('/blogs/show/:slug', blogController.show);

apiRoutes.get('/blogs/latest-blog', blogController.latest);
apiRoutes.get('/blogs/table', blogController.table);

apiRoutes.get('/products', coverController.products);
apiRoutes.get('/partners', coverController.partners);

apiRoutes.post('/policy-request', logsHistory, authVerifyIfExist, policyRequestController.store);
apiRoutes.post('/contact-us', mainController.contactUs);
apiRoutes.get('/review', reviewController.get);

// Routes under Auth
apiRoutes.post('/user/add-profile-details', logsHistory, authVerify, userController.addProfileDetails);
apiRoutes.post('/user/resend-verification-email', logsHistory, authVerify, userController.resendVerificationEmail);
apiRoutes.post('/user/verify-otp', logsHistory, authVerify, userController.verifyOtp);
apiRoutes.get('/user/profile', logsHistory, authVerify, userController.profile);
apiRoutes.post('/user/add-wallet-address', logsHistory, authVerify, userController.addWalletAddress);
apiRoutes.get('/user/cart-items', logsHistory, authVerify, userController.getCartItems);
apiRoutes.post('/user/cart-items', logsHistory, authVerify, userController.addCartItems);
apiRoutes.get('/user/policies', logsHistory, authVerify, policiesController.get);
apiRoutes.get('/user/policies/:id', logsHistory, authVerify, policiesController.show);
apiRoutes.post('/user/policies-mso', logsHistory, authVerify, policiesController.storeMso);
apiRoutes.post('/user/policies-smart-contract', logsHistory, authVerify, policiesController.storeSmartContract);
apiRoutes.post('/user/policies-device-insurance', logsHistory, authVerify, policiesController.storeDeviceInsurance);
apiRoutes.post('/user/policies-mso/:id/confirm-payment', logsHistory, authVerify, policiesController.msoConfirmPayment);
apiRoutes.post('/user/policies-smart-contract/:id/confirm-payment', logsHistory, authVerify, policiesController.smartContractConfirmPayment);
apiRoutes.post('/user/policies-device-insurance/:id/confirm-payment', logsHistory, authVerify, policiesController.deviceConfirmPayment);
apiRoutes.post('/user/policies/:id/add-review', logsHistory, authVerify, policiesController.policyReview);

var adminApis = require("./admin");
const utils = require('../libs/utils');
router.use('/', apiRoutes);


router.use('/admin', adminApis);
router.get('/request-logs', async (req, res) => {
    try {
        let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
        const skip = parseInt(range[0]);
        const limit = parseInt(range[1]) - skip;

        let findObj = {};
        const search = JSON.parse(_.get(req.query, "filter", "{}"));

        let total = await RequestLogs.countDocuments();

        let aggregate = [];
        // aggregate.push({ $match: findObj })
        aggregate.push({ $sort: { _id: -1 } })
        aggregate.push({ $skip: skip })
        aggregate.push({ $limit: limit })

        let request_logs = await RequestLogs.aggregate(aggregate);

        let data = {
            range: `${range[0]}-${range[1]}/${total}`,
            data: request_logs
        }

        return res.status(200).send(utils.apiResponseData(true, data));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
});
router.use('/seed', async (req, res, next) => {
    await require("./../seeder/users")();
    res.send(utils.apiResponseMessage(true, "success"));
});

module.exports = router;
