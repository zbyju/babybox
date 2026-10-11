const fs = require("fs");
const path = require("path");

const bootstrap = require("../../../bootstrap");

const VERSIONS_PATH = path.resolve(__dirname, "../../../versions.env");

function pinnedPm2Version(versionsPath) {
  const text = fs.readFileSync(versionsPath || VERSIONS_PATH, "utf8");
  const version = bootstrap.readVersions(text).PM2_VERSION || "";
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("PM2_VERSION chybi ve versions.env");
  }
  return version;
}

module.exports = {
  pinnedPm2Version,
};
