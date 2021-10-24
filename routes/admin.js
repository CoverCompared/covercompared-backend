var express = require('express');
var router = express.Router();
const loadFormDataMiddleware = require('./../middlewares/loadFormData')
const blogController = require('./../controllers/admin/blogs')

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



module.exports = router;