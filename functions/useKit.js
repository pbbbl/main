const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { api, express } = require("./api");
const crypto = require("crypto");
const randomBytes = (n = 16) => {
  return crypto.randomBytes(n || 16).toString("hex");
};
const secrets = require("./useKit.secrets.js");

const useKit = () => {
  let app;
  try {
    app = admin.app("[DEFAULT]");
    if (!app) {
      app = initialize().app;
    }
  } catch (error) {
    try {
      if (!app) {
        app = initialize().app;
      }
    } catch (error2) {
      SB_CRON_TOKEN({ initializeError2: error2 });
      app = null;
    }
  }
  const appOrAdmin = (key, valType = "function") => {
    if (!app) {
      return null;
    }
    const inApp =
      app && typeof app[key] != "undefined" && typeof app[key] == valType;
    if (inApp) {
      return app[key]();
    } else {
      const inAdmin =
        admin &&
        typeof admin[key] != "undefined" &&
        typeof admin[key] == valType;
      return inAdmin ? admin[key]() : null;
    }
  };

  const firestore = appOrAdmin("firestore");
  const db = firestore;

  return {
    functions,
    admin,
    api,
    express,
    randomBytes,
    db,
    firestore,
    app,
    secrets,
  };
};
(() => useKit())();
module.exports = {
  useKit,
  initialize,
  functions,
  admin,
  api,
  express,
  randomBytes,
  secrets,
};
function initialize() {
  const serviceAccount = require("./.serviceAccount.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pbbbl-main-default-rtdb.firebaseio.com",
  });
  return {
    functions,
    admin,
    app: admin.app("[DEFAULT]"),
  };
}
