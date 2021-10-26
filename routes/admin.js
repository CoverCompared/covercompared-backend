var express = require('express');
var router = express.Router();
const loadFormDataMiddleware = require('./../middlewares/loadFormData')
const blogController = require('./../controllers/admin/blogs')
const policyRequestController = require('./../controllers/admin/policy-requests')
const policies = require('./../controllers/admin/policies')

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
router.get('/policy-reqeusts', policyRequestController.show);
router.get('/policy-request/:id', policyRequestController.viewPolicyRequest);
router.get('/policies', policies.policyList);
router.get('/policies/:id', policies.viewPolicy);

module.exports = router;