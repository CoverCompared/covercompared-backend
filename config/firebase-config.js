
let value;
try { 
    value = atob(process.env.FIREBASE_PRIVATE_KEY);
} catch (error) {
    value = Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString();
}

exports.serviceAccount = JSON.parse(value)
  