const admin = require("firebase-admin");
const path = require("path");

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS must point to a Firebase service-account JSON file.");
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(credentialsPath)))
});

module.exports = admin;