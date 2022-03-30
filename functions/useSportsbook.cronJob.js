require("events").EventEmitter.defaultMaxListeners = 100;

const { functions, secrets } = require("./useKit");
const accessToken = secrets.SB_CRON_TOKEN;

const {
  getLiveGames,
  getTodaysGames,
  getUpcomingGames,
} = require("./useSportsbook.db");
const { getGamesById } = require("./useSportsbook.api");
const callSportsbookCronJob = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    const headers = req.headers;
    const authorized =
      headers &&
      headers.authorization &&
      headers.authorization.split(" ")[1] === accessToken;
    if (!authorized) {
      return res.status(403).send({
        message: "Access Denied",
        status: 403,
        code: "x-sportsbook-unauthorized",
      });
    } else {
      const games = await runSportsbookCronJob();
      return res.status(200).send(games);
    }
  });
async function runSportsbookCronJob() {
  const gameIds = await getCronJobGameIds();
  if (!gameIds) {
    return { gameIds: null, message: "No games ids to update found" };
  }
  const games = await getGamesById(gameIds);
  return games;
}
async function getCronJobGameIds() {
  const live = await getLiveGames();
  const todays = await getTodaysGames();
  const upcoming = await getUpcomingGames();
  const arr = [...(live || []), ...(todays || []), ...(upcoming || [])];
  const ids = arr && arr?.length > 0 ? arr.map((game) => game.gameId) : null;
  if (!ids) {
    return null;
  } else {
    return ids;
  }
}
module.exports = {
  modules: {
    callSportsbookCronJob,
  },
  runSportsbookCronJob,
  getCronJobGameIds,
};
