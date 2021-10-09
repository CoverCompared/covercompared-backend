var express = require('express');
var router = express.Router();

const coverController = require("./../controllers/covers");
const msoController = require("./../controllers/mso");
const p4lController = require("./../controllers/p4l");
const mainController = require("./../controllers/main");
const userController = require("./../controllers/user");
const blogController = require("../controllers/blogs");
const authVerify = require('../libs/middlewares/authVerify');

router.get('/cover-list', coverController.list);
router.get('/cover-options', coverController.options);
router.post('/cover-capacity', coverController.capacity);
router.post('/cover-quote', coverController.quote);
router.post('/cover-min-quote', coverController.minQuote);

router.get('/mso-list', msoController.list);
router.post('/p4l-forward', p4lController.forward);

router.post('/check-email-exist', mainController.checkEmailExist);
router.post('/login', mainController.login);

router.get('/blogs/image/:slug', blogController.image);
router.get('/blogs/show/:slug', blogController.show);

router.get('/blogs/latest-blog', blogController.latest);
router.get('/blogs/table', blogController.table);

router.get('/products', coverController.products);
router.get('/partners', coverController.partners);


router.post('/user/add-profile-details',  authVerify, userController.addProfileDetails);
router.post('/user/resend-verification-email',  authVerify, userController.resendVerificationEmail);
router.post('/user/verify-otp',  authVerify, userController.verifyOtp);
router.get('/user/profile',  authVerify, userController.profile);
router.post('/user/add-wallet-address',  authVerify, userController.addWalletAddress);
router.get('/user/cart-items',  authVerify, userController.getCartItems);
router.post('/user/cart-items',  authVerify, userController.addCartItems);

var adminApis = require("./admin");
router.use('/admin', adminApis);

module.exports = router;
