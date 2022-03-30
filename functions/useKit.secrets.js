const functions = require("firebase-functions");

const getSecrets = () => {
  return {
    ...functions.config().secrets,
  };
};
module.exports = getSecrets();
