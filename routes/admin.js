var express = require('express');
var router = express.Router();
const loadFormDataMiddleware = require('./../middlewares/loadFormData')
const blogController = require('./../controllers/admin/blogs')
const policyRequestController = require('./../controllers/admin/policy-requests')
const policiesController = require('./../controllers/admin/policies')
const contactController = require('./../controllers/admin/contact-us')
const AdminAuthController = require("./../controllers/admin/auth")
const adminVerifyPassword = require('../libs/middlewares/adminVerifyPassword');

router.post("/login", AdminAuthController.login)
router.get("/profile", adminVerifyPassword, AdminAuthController.profile)
router.get("/update-email", adminVerifyPassword, AdminAuthController.updateEmail)

router.param('blogId', blogController.load);
router.get('/blogs/', blogController.index);
router.post('/blogs/',
    loadFormDataMiddleware,
    blogController.validate("store"),
    blogController.store);
router.get('/blogs/:blogId', blogController.show);
router.delete('/blogs/:blogId', blogController.destroy);
router.put('/blogs/:blogId',
    loadFormDataMiddleware,
    blogController.validate("update"),
    blogController.update);

// policy-request routes 
router.get('/policy-requests', policyRequestController.index);
router.get('/policy-requests/:id', policyRequestController.show);
router.get('/policies', policiesController.index);
router.get('/policies/:id', policiesController.show);


// contact-us
router.get('/contact-us/table', adminVerifyPassword , contactController.table);
router.get('/contact-us/show/:id', adminVerifyPassword ,contactController.show);

module.exports = router;