var express = require('express');
var router = express.Router();

const coverController = require("./../controllers/covers");
const msoController = require("./../controllers/mso");
const p4lController = require("./../controllers/p4l");

router.get('/cover-list', coverController.list);
router.get('/cover-options', coverController.options);
router.post('/cover-capacity', coverController.capacity);
router.post('/cover-quote', coverController.quote);
router.post('/cover-min-quote', coverController.minQuote);

router.get('/mso-list', msoController.list);
router.post('/p4l-forward', p4lController.forward);

module.exports = router;
