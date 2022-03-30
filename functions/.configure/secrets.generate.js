const env = process.env;
const mode = env.NODE_ENV || "development";
const modeId =
  mode == "development" ? "dev" : mode == "staging" ? "stg" : "prd";
const { DOPPLER_TOKEN } = env;
const { DateTime, Settings } = require("luxon");
Settings.defaultZone = "America/Denver";
const jsonfile = require("jsonfile");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");
const Id = () => `rndid${Random(10)}${Random(10)}`;
const Random = (n = 16) => crypto.randomBytes(n).toString("hex");
const Token = () => Random(50);
const AesKey = () => Random(16);
const ApiKey = () => Random(32);
const crypto = require("crypto");

(async () => {
  try {
    const response = await axios.get(
      `https://${DOPPLER_TOKEN}@api.doppler.com/v3/configs/config/secrets/download?format=json`,
    );
    const secrets = response.data;

    const data = {
      ...secrets,

      API_TOKEN: Token(),
      API_AESKEY: AesKey(),
      API_SALTKEY: AesKey(),
      API_OWNER_TOKEN: Token(),
      API_DOPPLER_TOKEN: ApiKey(),
      SB_TOKEN: Token(),
      //   SB_CRON_TOKEN: Token(), // NEVER CHANGE ME
      SP_TOKEN: Token(),
      LOCKBOX_TOKEN: Token(),
      LOCKBOX_AESKEY: AesKey(),
      LOCKBOX_SALTKEY: AesKey(),
      SECRETS_ID: Id(),
      SECRETS_VERSION:
        typeof secrets.SECRETS_VERSION == "string"
          ? parseInt(secrets.SECRETS_VERSION) + 1
          : typeof secrets.SECRETS_VERSION == "number"
          ? secrets.SECRETS_VERSION + 1
          : 1,
    };

    const fileName = `${modeId}.secrets.tmp.${DateTime.now().toFormat(
      "yyyy-MM-dd--hh:mm:ss",
    )}.json`;
    const filePath = path.resolve(__dirname, "./secrets-generated/" + fileName);
    jsonfile.writeFileSync(filePath, data, { spaces: 4 });
    return spawn("code", [filePath]);
  } catch (err) {
    setTimeout(() => {
      console.warn("Error generating secrets:");
      console.warn({ error: err });
    }, 2000);
    return null;
  }
})();

// const envs = {
//   root: dotenv.config({ path: "../.env" }),
//   dev: dotenv.config({ path: "../.env.development" }),
//   stg: dotenv.config({ path: "../.env.staging" }),
//   prd: dotenv.config({ path: "../.env.production" }),
// };

// console.log(envs);
