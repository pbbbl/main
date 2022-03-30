const { functions, secrets, db, admin } = require("./useKit").useKit();
const { apiModule } = require("./api.js");

const secretsModule = functions.https.onRequest(async (req, res) => {
  return res.status(200).json(secrets);
});

const dbStore = require("./dbStore");
const pubsubStore = require("./pubsubStore");

const sportsbook = require("./useSportsbook.js");
module.exports = {
  api: apiModule,
  ...dbStore.modules,
  secrets: secretsModule,
  ...sportsbook.modules,
};
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
