const { DateTime } = require("luxon");

const { db, functions } = require("./useKit").useKit();
const gamesRef = db.collection("games");
async function getLiveGames() {
  const query = gamesRef.where("states.isLive", "==", true);
  const snap = await query.get();
  const isEmpty = (snap && snap.empty) || snap.size == 0;
  if (isEmpty) {
    return null;
  } else {
    return snap.docs.map((doc) => doc.data());
  }
}
async function getTodaysGames() {
  const todayScheduleId = DateTime.local({
    zone: "America/Los_Angeles",
  }).toISODate();

  const query = gamesRef.where("scheduleId", "==", `${todayScheduleId}`);
  const snap = await query.get();
  const isEmpty = (snap && snap.empty) || snap.size == 0;
  if (isEmpty) {
    return null;
  } else {
    return snap.docs.map((doc) => doc.data());
  }
}

async function getUpcomingGames() {
  const query = gamesRef
    .where("states.isFuture", "==", true)
    .where("states.isUpcoming", "==", true);
  const snap = await query.get();
  const isEmpty = (snap && snap.empty) || snap.size == 0;
  if (isEmpty) {
    return null;
  } else {
    return snap.docs.map((doc) => doc.data());
  }
}

module.exports = {
  getLiveGames,
  getTodaysGames,
  getUpcomingGames,
};
