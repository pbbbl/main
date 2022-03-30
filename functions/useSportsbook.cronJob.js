require("events").EventEmitter.defaultMaxListeners = 100;

const { functions, secrets } = require("./useKit");
const accessToken = secrets.SB_CRON_TOKEN;

const {
  getLiveGames,
  getTodaysGames,
  getUpcomingGames,
} = require("./useSportsbook.db");

const {
    getGames,
    getGamesByDate,
  
  } = require("./useSportsbook.api");
const { getGamesById } = require("./useSportsbook.api");
const { DateTime } = require("luxon");
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
  let games= []
  if (gameIds && gameIds?.length > 0) {
       const gamesFromIds = await getGamesById(gameIds);
       if(gamesFromIds?.length > 0){
           gamesFromIds.forEach((game)=>{games.push(game)})
       }
  }
  const dttoday = DateTime.local({zone:'America/Los_Angeles'}).startOf('day').plus({minutes:30})toISODate();
  const dttomorrow = DateTime.local({zone:'America/Los_Angeles'}).endOf('day').plus({minutes:30}).toISODate();
  const freshGames = await getGamesByDate(dttoday,dttomorrow);
  return [...games,...freshGames||[]]

}
async function getCronJobGameIds() {
  const todaysGames = await getTodaysGames();
  const liveGames = await getLiveGames();
//   const upcoming = await getUpcomingGames();
  const arr = [...(liveGames || []), ...(todaysGames||[]) ];
  if(arr?.length > 0){
      return arr.map((game)=>game.gameId)
  } else {
      return null;
  }
}
module.exports = {
  modules: {
    callSportsbookCronJob,
  },
  runSportsbookCronJob,
  getCronJobGameIds,
};
