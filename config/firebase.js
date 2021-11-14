const admin = require("firebase-admin");
const {serviceAccount} = require("./firebase-config");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: ""
});

exports.firebase_admin = admin;