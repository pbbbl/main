const { DateTime, Settings } = require("luxon");
Settings.defaultLocale = "en-US";
Settings.defaultTimeZone = "utc";
const dt = DateTime;

function parseTS(ts) {
  return DateTime.fromMillis(ts);
}
function parseIso(iso) {
  return DateTime.fromISO(iso);
}

function parseOBJ(obj) {
  return DateTime.fromObject(obj || OBJ());
}
function toZone(dt, zoneCode = "America/Denver") {
  const zone = DateTime.fromISO(zoneCode);
  return dt.setZone(zone);
}
function DT() {
  return DateTime.now();
}
function TS() {
  return DateTime.now().toMillis();
}
function ISO() {
  return DateTime.now().toISO();
}
function OBJ() {
  return DateTime.now().toObject();
}
const useTime = () => {
  DateTime, dt, parseTS, parseIso, parseOBJ, toZone, DT, TS, ISO, OBJ;
};

module.exports = {
  DateTime,
  useTime,
  dt,
  parseTS,
  parseIso,
  parseOBJ,
  toZone,
  DT,
  TS,
  ISO,
  OBJ,
};
