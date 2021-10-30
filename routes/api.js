var express = require('express');
var router = express.Router();

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

router.get('/cover-list', coverController.list);
router.get('/cover-options', coverController.options);
router.post('/cover-capacity', coverController.capacity);
router.post('/cover-quote', coverController.quote);
router.post('/cover-min-quote', coverController.minQuote);

router.get('/mso-list', msoController.list);
router.post('/p4l-forward', p4lController.forward);

router.post('/check-email-exist', mainController.checkEmailExist);
router.post('/login', mainController.login);
router.post('/landing-app-subscribe', mainController.landingAppSubscribe);

router.get('/blogs/image/:slug', blogController.image);
router.get('/blogs/show/:slug', blogController.show);

router.get('/blogs/latest-blog', blogController.latest);
router.get('/blogs/table', blogController.table);

router.get('/products', coverController.products);
router.get('/partners', coverController.partners);


router.post('/policy-request', authVerifyIfExist, policyRequestController.store);
router.get('/review', reviewController.get);

router.post('/user/add-profile-details',  authVerify, userController.addProfileDetails);
router.post('/user/resend-verification-email',  authVerify, userController.resendVerificationEmail);
router.post('/user/verify-otp',  authVerify, userController.verifyOtp);
router.get('/user/profile',  authVerify, userController.profile);
router.post('/user/add-wallet-address',  authVerify, userController.addWalletAddress);
router.get('/user/cart-items',  authVerify, userController.getCartItems);
router.post('/user/cart-items',  authVerify, userController.addCartItems);
router.get('/user/policies',  authVerify, policiesController.get);
router.get('/user/policies/:id',  authVerify, policiesController.show);
router.post('/user/policies-mso',  authVerify, policiesController.storeMso);
router.post('/user/policies-device-insurance',  authVerify, policiesController.storeDeviceInsurance);
router.post('/user/policies-mso/:id/confirm-payment',  authVerify, policiesController.msoConfirmPayment);
router.post('/users/policies-device-insurance/:id/confirm-payment',  authVerify, policiesController.deviceConfirmPayment);
router.post('/users/policy/:id/add-review',  authVerify, policiesController.policyReview);





var adminApis = require("./admin");
router.use('/admin', adminApis);

module.exports = router;
