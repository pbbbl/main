const functions = require("firebase-functions");

const express = require("express");
const api = express();
api.get("/", (_, res) => {
  return res.status(200).send("howdy");
});
const routes = ["./api.secrets.js"];
routes.forEach((rt) => {
  const route = require(rt);
  route(api);
});
// api.post('/secrets/dplswh', secrets.dplswh.post);

const apiModule = functions.https.onRequest(api);
module.exports = {
  express,
  api,
  modules: { api: apiModule },
  apiModule,
};

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
