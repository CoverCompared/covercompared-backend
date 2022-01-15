const formidable = require("formidable");

module.exports = (req, res, next) => {
  var form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    try {
      req.files = files;
      req.body = req.fields = fields;
      req.fields = { ...files, ...fields };
      next();
    } catch (error) {
      res.send({ status: false }).status(500)
    }
  })
}

