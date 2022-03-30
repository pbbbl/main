const { snakeCase } = require("change-case-all");
const serialize = require("serialize-javascript");

const IS = require("is");
const axios = require("axios");
const { db, secrets, functions } = require("./useKit").useKit();

const apiKey = secrets.SPORTSPAGE_API_KEY;
const clean = require("@pbbbl/clean");

const { TS, DateTime } = require("./useTime");
const yup = require("yup");
const sp = {
  leagues: ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"],
  conferences: [],
  divisions: [],
  teams: [],
};
const endpoints = getEndpoints();

const getGamesById = async (ids = []) => {
  const allow = ids && ids?.length > 0;
  const cid = "games";
  if (!allow) {
    return null;
  } else {
    const games = await Promise.all(
      ids.map(async (id, index) => {
        const delay = (index + 1) * 75;
        return await new Promise((resolve) =>
          setTimeout(async () => {
            const results = await endpoints.gameById({ gameId: id });
            let item;
            if (results && Array.isArray(results) && results?.length > 0) {
              item = results[0];
            } else {
              item = results;
            }
            const scheduleDate = item && item.schedule && item.schedule.date;

            if (scheduleDate) {
              const scheduleId = getScheduleId(scheduleDate);
              const ts = TS();

              const dbResult = await transformAndSaveGame({
                id,
                ts,
                item,
                cid,
                eid: "gameById",
                scheduleId,
              });
              return resolve(dbResult);
            } else {
              return resolve({ ERROR: ["errorItem", item] });
            }
          }, delay),
        );
        // const scheduleId = DateTime.fromISO(item.schedule.date).toISODate();

        // const dbResult = await transformAndSaveGame({
        //   item,
        //   scheduleId,
        //   cid,
        //   ts,
        // });
        // return dbResult;

        //  const savedGame = transformAndSaveGame({id, cid, item:game});
      }),
    );
    return games;
  }
};
const getGamesByDate = async (date1, date2 = null) => {
  let date = date1;
  if (date2) {
    date += `,${date2}`;
  }
  const params = {
    date,
  };
  const games = await endpoints.games(params);
  return games;
};
module.exports = {
  endpoints,
  getGames: endpoints.games,
  getGamesByDate,
  //   modules: { getSbGames },
  getGamesById,
};

function getScheduleId(scheduleDate) {
  return DateTime.fromISO(scheduleDate).toISODate();
}
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
    if (results && cid == "games") {
      const output = await Promise.all(
        results.map(async (item) => {
          const id = `${item.id || item.gameId}`;
          const scheduleId = item.schedule.date
            ? getScheduleId(item.schedule.date)
            : null;
          const dbResult = await transformAndSaveGame({
            id,
            ts,
            item,
            cid,
            eid,
            scheduleId,
          });
          return dbResult;
        }),
      );
      return output && output?.length > 0
        ? output.length === 1
          ? output[0]
          : output
        : false;
    } else {
      return {
        results: false,
      };
    }
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
      gameId: yup.mixed().oneOf([yup.number(), yup.string().trim()]),
      league: yup.string().oneOf(sp.leagues),
      conference: yup.string().optional().nullable().default(null),
      division: yup.string().optional().nullable().default(null),
      date: yup.array().of(yup.string().trim().matches(isoRegex)).min(1).max(2),
      team: yup.string().optional().nullable().default(null),
      status: yup
        .string()
        .oneOf(["scheduled", "in progress", "final", "cancelled", "delayed"])
        .optional(),
      odds: yup.string().oneOf(["moneyline", "spread", "total", "any"]),
      skip: yup.number().integer().min(0).max(100).optional(),
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
      conference: Params().conference.optional().nullable().default(null),
      division: Params().division.optional().nullable().default(null),
      ...Defaults(),
    }),
    games: yup.object({
      league: Params().league.optional().nullable().default(null),
      conference: Params().conference.optional().nullable().default(null),
      division: Params().division.optional().nullable().default(null),
      date: Params().date.optional().nullable().default(null),
      team: Params().team.optional().nullable().default(null),
      status: Params().status.optional().nullable().default(null),
      odds: Params().odds.optional().nullable().default(null),
      skip: Params().skip.optional().nullable().default(null),
      ...Defaults(),
    }),
    gameById: yup.object({
      gameId: Params().gameId.required(),
      ...Defaults(),
    }),
    odds: yup.object({
      gameId: Params().gameId.required(),
      type: Params().odds.optional().nullable().default(null),
      ...Defaults(),
    }),
  };
  function Options(eid, params) {
    const keysWithValues = Object.keys(params).filter((key) =>
      typeof params[key] !== "undefined" && !!params[key] ? true : false,
    );

    Object.keys(params).forEach((key) => {
      if (!keysWithValues.includes(key)) {
        delete params[key];
      }
    });

    const hasParams =
      Object.keys(params) && Object.keys(params).length > 0
        ? Object.keys(params).join("&")
        : false;
    const toParams = hasParams ? { params } : {};

    return {
      method: "GET",
      url: `https://sportspage-feeds.p.rapidapi.com/${eid}`,
      ...toParams,
      headers: {
        "X-RapidAPI-Host": "sportspage-feeds.p.rapidapi.com",
        "X-RapidAPI-Key": apiKey,
      },
    };
  }
  async function conferences($params) {
    const isValid = await schemas.conferences.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });
    const result = await useApi(Options("conferences", $params), "conferences");
    return result;
  }
  async function teams($params) {
    const isValid = await schemas.teams.isValid($params);
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });
    const result = await useApi(Options("teams", $params), "teams");
    return result.data;
  }
  async function games($params) {
    const isValid = schemas.games.cast($params || {});
    if (!isValid)
      throw new Error("Invalid Parameters", { validResults: isValid });
    const result = await useApi(Options("games", $params), "games");
    return result;
  }

  async function gameById({ gameId = null, id = null }) {
    if (!gameId && id) {
      gameId = id;
    } else if (!id && gameId) {
      id = gameId;
    }

    const result = await useApi(Options("gameById", { gameId }), "gameById");
    return result;
  }
  //   async function gameById($params) {
  //     const isValid = await schemas.gameById.isValid($params);
  //     if (!isValid)
  //       throw new Error("Invalid Parameters", { validResults: isValid });

  //     const result = await useApi(Options("gameById", $params), "gameById");
  //     return result;
  //   }

  async function odds({ gameId = null, id = null }) {
    if (!gameId && id) {
      gameId = id;
    } else if (!id && gameId) {
      id = gameId;
    }

    const result = await useApi(Options("odds", { gameId }), "odds");
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

async function transformAndSaveGame({ ts, item, cid, scheduleId }) {
  //   const ts = TS();
  const id = `${item.id || item.gameId}`;
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
    IS.defined(item.odds) && IS.defined(item.odds[0]) ? item.odds[0] : null;

  const timeNow = DateTime.now();
  const gameTime = DateTime.fromISO(item.gameTime);
  const gameTimeDiff = gameTime.diff(timeNow);

  const isLeague = item.details.league;
  const isNHL = item.details.league === "NHL";
  const isMLB = item.details.league === "MLB";
  const isNFL = item.details.league === "NFL";
  const isNBA = item.details.league === "NBA";
  const isNCAAB = item.details.league === "NCAAB";
  const isNCAAF = item.details.league === "NCAAF";
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
  //   const hasOddsOpen =
  //     IS.defined(odds) &&
  //     IS.defined(odds) &&
  //     !IS.defined(odds.closeDate);
  //   const hasOddsClosed = item.odds.closed;
  //   const hasOddsCurrent = item.odds.current;

  const isPreseason =
    IS.defined(item.details.season) && item.details.season == "preseason";
  const isRegularSeason =
    IS.defined(item.details.season) && item.details.season == "regular";
  const isPostseason =
    IS.defined(item.details.season) && item.details.season == "postseason";

  const getTeamIds = () => {
    return Object.keys(item.teams).map((t) => {
      const { team, abbreviation } = item.teams[t];
      const leagueId = item.details.league;
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
      //   hasOddsOpen,
      //   hasOddsClosed,
      //   hasOddsCurrent,
      isPreseason,
      isRegularSeason,
      isPostseason,
    },
  };
  const cleaned = clean(data);

  const dbref = db.collection(cid).doc(id);
  await dbref.set(cleaned);
  return cleaned;
}

async function setArchive(id, cid, data) {
  data.archivedAt = TS();

  const archiveId = `${id}_${data.archivedAt}_history`;
  const dbref = db.collection(cid).doc(id).collection("history").doc(archiveId);
  await dbref.set(data);
  return { path: dbref.path, id: archiveId, data };
}

async function setOg(id, cid, data) {
  const ts = TS();
  //   data.og = { createdAt: ts };
  data = { ...data, og: { createdAt: ts } };

  const docid = `${id}_${ts}_og_result`;
  const dbref = db.collection(cid).doc(id).collection("og").doc(docid);
  await dbref.set(data);
  return { path: dbref.path, id: docid, data };
}
