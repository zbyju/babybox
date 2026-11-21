// Runs the real release path with an interrupted rename or an offline update.
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs-extra");
const path = require("path");
const { onStartup } = require("../src/logic/start/dist-release");

const mode = process.argv[2];
const fileSystem = Object.create(fs);
const run = promisify(exec);
let attemptedOfflineInstall = false;
let staged = false;

fileSystem.renameSync = (from, to) => {
  fs.renameSync(from, to);
  const boundary = path.basename(from) + ">" + path.basename(to);
  if (boundary === mode) {
    // Leave the filesystem exactly as the next login would see it.
    process.exit(45);
  }
};

onStartup({
  fs: fileSystem,
  exec: async (command, options) => {
    if (mode === "offline") {
      if (command === "git pull") {
        throw new Error("network unavailable");
      }
    }
    if (mode === "offline" || (mode === "health-offline" && staged)) {
      if (command.includes("install")) {
        attemptedOfflineInstall = true;
        throw new Error("package registry unavailable");
      }
    }
    const result = await run(command, options);
    if (
      command.includes("install") &&
      path.basename(options.cwd) === "dist-next"
    ) {
      staged = true;
    }
    return result;
  },
  // On the rollback boundary case, force the new backend health probe to fail
  // after pm2 accepts the configuration. The calling test checks the restored services.
  ...(mode === "dist2>dist" || mode === "health-offline"
    ? {
        statusWaitMs: 0,
        httpGet: async (url) => (url.includes(":5000/") ? 503 : 200),
      }
    : {}),
}).then((ok) => {
  process.exitCode = ok && !attemptedOfflineInstall ? 0 : 1;
});
