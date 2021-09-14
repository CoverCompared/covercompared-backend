var express = require('express');
var router = express.Router();

const coverController = require("./../controllers/covers");
const msoController = require("./../controllers/mso");

router.get('/cover-list', coverController.list);
router.get('/cover-options', coverController.options);
router.post('/cover-capacity', coverController.capacity);
router.post('/cover-quote', coverController.quote);
router.post('/cover-min-quote', coverController.minQuote);

router.get('/mso-list', msoController.list);

module.exports = router;
