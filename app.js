const dotenv = require("dotenv");
dotenv.config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const axios = require("axios");
const { connect } = require("./connect");

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

if (process.env.NODE_ENV == "local") {
  app.use(require("cors")())
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', express.static(path.join(__dirname, 'public')));

module.exports = async () => {
  let con = await connect();

  var indexRouter = require('./routes/index');
  var apiRouter = require('./routes/api');  
  app.use('/api', indexRouter);
  app.use('/api', apiRouter);
  return app;
};



