var express = require('express');
var router = express.Router();
const loadFormDataMiddleware = require('./../middlewares/loadFormData')
const blogController = require('./../controllers/admin/blogs')
const policyRequestController = require('./../controllers/admin/policy-requests')
const policiesController = require('./../controllers/admin/policies')
const contactController = require('./../controllers/admin/contact-us')
const AdminAuthController = require("./../controllers/admin/auth")
const AdminController = require("./../controllers/admin/admin");

const adminVerifyPassword = require('../libs/middlewares/adminVerifyPassword');

router.post("/login", AdminAuthController.login)
router.get("/constants", AdminController.constants)
router.get('/policies', policiesController.index);

let authRoutes = express.Router();

authRoutes.get("/profile", AdminAuthController.profile)
authRoutes.get("/dashboard", AdminController.dashboard)
authRoutes.get("/update-email", AdminAuthController.updateEmail)

// Blog module routes
authRoutes.param('blogId', blogController.load);
authRoutes.get('/blogs/', blogController.index);
authRoutes.post('/blogs/', loadFormDataMiddleware, blogController.validate("store"), blogController.store);
authRoutes.get('/blogs/:blogId', blogController.show);
authRoutes.delete('/blogs/:blogId', blogController.destroy);
authRoutes.put('/blogs/:blogId', loadFormDataMiddleware, blogController.validate("update"), blogController.update);

// policy-request routes 
authRoutes.get('/policy-requests', policyRequestController.index);
authRoutes.get('/policy-requests/:id', policyRequestController.show);
// authRoutes.get('/policies', policiesController.index);
authRoutes.get('/policies/:id', policiesController.show);
// authRoutes.delete('/policies/:id/delete', policiesController.destroy);


// contact-us
authRoutes.get('/contact-us/table', adminVerifyPassword , contactController.table);
authRoutes.get('/contact-us/show/:id', adminVerifyPassword ,contactController.show);

router.use("/", adminVerifyPassword, authRoutes);


module.exports = router;