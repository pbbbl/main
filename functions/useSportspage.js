const { camelCase, snakeCase } = require("change-case-all");
const IS = require("is");
const axios = require("axios");
const { db, admin, functions, api } = require("./useKit").useKit();

const { TS, DateTime } = require("./useTime");
const yup = require("yup");
const sp = {
  leagues: ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"],
  conferences: [],
  divisions: [],
  teams: [],
};
const endpoints = getEndpoints();
const getSbGames = functions.https.onRequest(async (req, res) => {
  const future = await endpoints.games({
    date: "2022-03-29,2022-03-31",
    status: "scheduled",
  });
  const live = await endpoints.games({ status: "in progress" });
  const past = await endpoints.games({
    date: "2022-03-29,2022-03-31",
    status: "final",
  });

  const responseData = {
    future,
    live,
    past,
  };
  return res.status(200).send(responseData);
});
const modules = { getSbGames };

function useSportspage() {
  return {
    endpoints,
    modules,
  };
}
module.exports = useSportspage;
// function getSurroundingDates(
//   isoDate = DateTime.local({ zone: "America/Los_Angeles" }).toISODate(),
// ) {
//   const dt = DateTime.fromISO(isoDate);
//   const dtny = dt.local({ zone: "America/New_York" });
//   const dtla = dt.local({ zone: "America/Los_Angeles" });

//   const nextDate = dtny
//     .endOf("day")
//     .minus({ minutes: 5 })
//     .plus({ days: 1 })
//     .toISODate();
//   const prevDate = dtla
//     .startOf("day")
//     .plus({ minutes: 5 })
//     .minus({ days: 1 })
//     .toISODate();
//   const currentDate = dtla.endOf("day").minus({ hours: 12 }).toISODate();
//   return [prevDate, currentDate, nextDate];
// }
async function useApi(options, eid) {
  const cids = {
    conferences: "conferences",
    teams: "teams",
    // divisions: "divisions",
    games: "games",
    gameById: "games",
    odds: "odds",
  };
  const countKeys = {
    conferences: "conferences",
    teams: "teams",
    games: "games",
    odds: "odds",
    gameById: "games",
  };
  const cid = cids[eid];
  const countKey = countKeys[eid];
  try {
    const response = await axios.request(options);
    const data = response.data;
    const count = typeof data[countKey] == "number" ? data[countKey] : 0;
    const empty = !(count && count > 0);
    const { status } = data;
    if (status !== 200) {
      throw new Error(`${status}`);
    }
    const ts = DateTime.fromISO(data.time).toLocal({ zone: "utc" }).toMillis();
    let results = data.results;
    if (empty) {
      results = null;
    }
    function getScheduleId(scheduleDate) {
      return DateTime.fromISO(scheduleDate).toISODate();
    }
    if (results && cid == "games") {
      const output = await Promise.all(
        results.map(async (item) => {
          const id = `${item.id || item.gameId}`;
          const scheduleId = item.schedule.date
            ? getScheduleId(item.schedule.date)
            : null;
          const dbResult = await transformAndSaveGame()[cid]({
            id,
            ts,
            item,
            cid,
            eid,
            scheduleId,
          });
          // const dbResult = await transformAndSaveGame(`${cid}/${transformed.id}`,transformed);
          return { id, scheduleId, dbResult };
        }),
      );
      return output;
    }
    return {
      results,
    };
  } catch (error) {
    SB_CRON_TOKEN("error getting sportspage data at useApi", {
      error,
      options,
      eid,
    });
  }
}
function getEndpoints() {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  // date: yup.string().trim().matches(/^((\d{4})-(\d{2})-(\d{2})){1}(,{1}(\d{4})-(\d{2})-(\d{2})){0,1}/igm).optional(),
  function Params() {
    return {
      getXml: yup.string().matches("xml").optional().nullable(),
      gameId: yup.oneOf([yup.number(), yup.string().trim()]),
      league: yup.optional().oneOf(sp.leagues),
      conference: yup.optional().oneOf(sp.conferences),
      division: yup.optional().oneOf(sp.divisions),
      date: yup.array().of(yup.string().trim().matches(isoRegex)).min(1).max(2),
      team: yup.string().optional().oneOf([]),
      status: yup
        .string()
        .optional()
        .oneOf(["scheduled", "in progress", "final", "cancelled", "delayed"]),
      odds: yup
        .array()
        .of(yup.array().of(["moneyline", "spread", "total"]), "any"),
      skip: yup.number().integer().min(0).max(100),
    };
  }
  function Defaults() {
    return {
      getXml: Params().getXml.default(undefined),
    };
  }
  const schemas = {
    conferences: yup.object({
      league: Params().league.required(),
      ...Defaults(),
    }),
    teams: yup.object({
      league: Params().league.required(),
      conference: Params().conference.optional().default(undefined),
      division: Params().division.optional().default(undefined),
      ...Defaults(),
    }),
    games: yup.object({
      league: Params().league.optional().default(undefined),
      conference: Params().conference.optional().default(undefined),
      division: Params().division.optional().default(undefined),
      date: Params().date.optional().default(undefined),
      team: Params().team.optional().default(undefined),
      status: Params().status.optional().default(undefined),
      odds: Params().odds.optional().default(undefined),
      skip: Params().skip.optional().default(undefined),
      ...Defaults(),
    }),
    gameById: yup.object({
      gameId: Params().gameId.required(),
      ...Defaults(),
    }),
    odds: yup.object({
      gameId: Params().gameId.required(),
      type: Params().odds.optional().default(undefined),
      ...Defaults(),
    }),
  };
  function Options(eid, params) {
    const keysWithValues = Object.keys(params).filter((key) =>
      typeof params[key] !== "undefined" && !!params[key] ? true : false,
    );
    let paramKeys =
      keysWithValues && keysWithValues?.length > 0 ? keysWithValues : false;
    Object.keys(params).forEach((key) => {
      if (!keysWithValues.includes(key)) {
        delete params[key];
      }
    });
    switch (eid) {
      // case 'games':
      //     if(!paramKeys){
      //         const [prevDate,_,nextDate] = getSurroundingDates();
      //         params = {
      //             date:`${prevDate},${nextDate}`,
      //         }
      //     }
      //     break;
      case "odds":
        if (params.odds?.length > 0) {
          if (params.odds.includes("any")) {
            params.odds = "any";
          } else {
            params.odds = params.odds.join(",");
          }
        }
        break;
      default:
        break;
    }
    paramKeys =
      Object.keys(params) && Object.keys(params).length > 0
        ? Object.keys(params).join("&")
        : false;
    const toParams = paramKeys ? { params } : {};
    return {
      method: "GET",
      url: `https://sportspage-feeds.p.rapidapi.com/${eid}`,
      ...toParams,
      headers: {
        "X-RapidAPI-Host": "sportspage-feeds.p.rapidapi.com",
        "X-RapidAPI-Key": "19e07c27dfmsh1f304ac6bad3951p18d70fjsn1baa3932edf4",
      },
    };
  }
  async function conferences($params) {
    const isValid = await schemas.conferences.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });
    const result = await useApi(Options("conferences", $params), "conferences");
    return result.data;
  }
  async function teams($params) {
    const isValid = await schemas.teams.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });
    const result = await useApi(Options("teams", $params), "teams");
    return result.data;
  }
  async function games($params) {
    const isValid = await schemas.games.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });

    const result = await useApi(Options("games", $params), "games");
    return result.data;
  }

  async function gameById($params) {
    const isValid = await schemas.gameById.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });

    const result = await useApi(Options("gameById", $params), "gameById");
    return result.data;
  }

  async function odds($params) {
    const isValid = await schemas.odds.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });

    const result = await useApi(Options("odds", $params), "odds");
    return result.data;
  }
  return {
    conferences,
    teams,
    games,
    gameById,
    odds,
  };
}

function useTransformers() {
  return {
    transformGames,
    transformTeams,
    transformConferences,
    transformOdds,
  };
}
async function dbCreate(id, cid, data) {
  const dbref = db.collection(cid).doc(id);
  await dbref.set(data);
  return data;
}
function dbUpdate(id, cid, data) {
  const dbref = db.collection(cid).doc(id);
  return dbref.update(data);
}
function dbGet(id, cid) {
  return db
    .collection(cid)
    .doc(id)
    .get()
    .then((snap) => {
      return snap.exists ? snap.data() : false;
    });
}
function dbDelete(id, cid) {
  return db.collection(cid).doc(id).delete();
}

async function transformAndSaveGame({ ts, item, cid, eid, scheduleId }) {
  const id = (item.id || item.gameId) + `_${cid}`;
  let data = {
    id,
    cid,
    scheduleId,

    createdAt: ts,
    updatedAt: ts,
  };
  const current = await dbGet(id, cid);
  if (current) {
    data.createdAt = current.createdAt;

    await setArchive(id, cid, current);
  }
  await setOg(id, cid, item);

  const odds =
    is.defined(item.odds) && is.defined(item.odds[0]) ? item.odds[0] : null;

  const timeNow = DateTime.now();
  const gameTime = DateTime.fromISO(item.gameTime);
  const gameTimeDiff = gameTime.diff(timeNow);

  const isLeague = item.summary.details.league;
  const isNHL = item.summary.details.league === "NHL";
  const isMLB = item.summary.details.league === "MLB";
  const isNFL = item.summary.details.league === "NFL";
  const isNBA = item.summary.details.league === "NBA";
  const isNCAAB = item.summary.details.league === "NCAAB";
  const isNCAAF = item.summary.details.league === "NCAAF";
  const isBasketball = isNBA || isNCAAB;
  const isFootball = isNFL || isNCAAF;
  const isBaseball = isMLB;
  const isHockey = isNHL;
  const isPro = isNHL || isMLB || isNFL || isNBA;
  const isCollege = isNCAAB || isNCAAF;

  const isFuture = item.status == "scheduled";
  const isLive = item.status == "in progress";
  const isInProgress = item.status == "in progress";
  const isPast = item.status == "final";
  const isFinal = item.status == "final";
  const isDelayed = item.status == "delayed";
  const isCancelled = item.status == "cancelled";

  const isTomorrow = gameTime.hasSame(timeNow.plus({ days: 1 }), "day");
  const isToday = gameTime.hasSame(timeNow, "day");
  const isYesterday = gameTime.hasSame(timeNow.minus({ days: 1 }), "day");
  const isSoon = gameTimeDiff.as("minutes") < 30;
  const isStarting = gameTimeDiff.as("minutes") < 5;
  const hasOdds = !!odds;
  const hasOddsOpen =
    is.defined(odds) &&
    is.defined(odds.openDate) &&
    !is.defined(odds.closeDate);
  const hasOddsClosed = item.odds.closed;
  const hasOddsCurrent = item.odds.current;

  const isPreseason =
    is.defined(item.summary.details.season) &&
    item.summary.details.season.includes("preseason");
  const isRegularSeason =
    is.defined(item.summary.details.season) &&
    item.summary.details.season.includes("regular");
  const isPlayoffs =
    is.defined(item.summary.details.season) &&
    item.summary.details.season.includes("playoffs");

  const getTeamIds = () => {
    return Object.keys(item.teams).map((t) => {
      const { team, abbreviation } = item.teams[t];
      const leagueId = item.summary.details.league;
      const teamId = snakeCase(`${team} ${abbreviation} ${leagueId}`);
      return teamId;
    });
  };
  const teamIds = getTeamIds();
  data = {
    ...data,
    ...item,
    teamIds,
    odds: odds || null,
    states: {
      isLeague,
      isNHL,
      isMLB,
      isNFL,
      isNBA,
      isNCAAB,
      isNCAAF,
      isBasketball,
      isFootball,
      isBaseball,
      isHockey,
      isPro,
      isCollege,
      isFuture,
      isLive,
      isInProgress,
      isPast,
      isFinal,
      isDelayed,
      isCancelled,
      isTomorrow,
      isToday,
      isYesterday,
      isSoon,
      isStarting,
      hasOdds,
      hasOddsOpen,
      hasOddsClosed,
      hasOddsCurrent,
      isPreseason,
      isRegularSeason,
      isPlayoffs,
    },
  };

  const dbref = db.collection(cid).doc(id);
  await dbref.set(data);
  return data;
}

async function setArchive(id, cid, data) {
  data.archivedAt = TS();

  const archiveId = `${id}_${data.archivedAt}_history`;
  const dbref = db.collection(cid).doc(id).collection("history").id(archiveId);
  await dbref.set(data);
  return { path: dbref.path, id: archiveId, data };
}

async function setOg(id, cid, data) {
  const ts = TS();
  data.og = { createdAt: ts };

  const docid = `${id}_${ts}_og_result`;
  const dbref = db.collection(cid).doc(id).collection("og").doc(docid);
  await dbref.set(data);
  return { path: dbref.path, id: docid, data };
}
