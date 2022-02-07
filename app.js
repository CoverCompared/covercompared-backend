const dotenv = require("dotenv");
dotenv.config();
const moment = require("moment");

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const axios = require("axios");
const { connect } = require("./connect");
const { cron } = require("./libs/cron");

// Add a request interceptor
axios.interceptors.request.use(function (config) {
  // Do something before request is sent
  console.log("config", config.url);
  return config;
}, function (error) {
  // Do something with request error
  return Promise.reject(error);
});

var app = express();

if (
  process.env.NODE_ENV == "local" ||
  process.env.NODE_ENV == "staging" ||
  "1" == process.env.ALLOW_CORS
) {
  app.use(require("cors")())
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', express.static(path.join(__dirname, 'public')));
app.use('/api/log', express.static(path.join(__dirname, 'uploads/logs')));

var fs = require('fs')


console.log = function(...d) {
  fs.appendFile(path.join(__dirname, `uploads/logs/${moment().format("DD-MM-YYYY")}.txt`),   (moment().format("HH:MM:ss ") + (Array.isArray(d) ? d.join(", ") : JSON.stringify(d)) + "\n"), () => {})
  console.info(...d)
};


module.exports = async () => {
  
  /**Connect Database */
  let con = await connect();

  /** Start Cron job */
  await cron();

  var indexRouter = require('./routes/index');
  var apiRouter = require('./routes/api');
  app.use('/api', indexRouter);
  app.use('/api', apiRouter);
  return app;
};



