const util = require("util");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;

const UpdateResult = {
  Error: "UpdateError",
  Updated: "UpdateSuccess",
  Unchanged: "UpdateUnchanged",
};

async function update() {
  try {
    const { stdout, stderr } = await exec("git pull");
    if (stderr) return UpdateResult.Error;
    if (stdout === "Already up to date") return UpdateResult.Unchanged;
    return UpdateResult.Updated;
  } catch (err) {
    console.log("error: " + err);
    return UpdateResult.Error;
  }
}

async function start() {
  try {
    await exec("pm2 delete index");
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    return new Promise((resolve, reject) => {
      const pnpm = spawn("pnpm.cmd", ["start"], {
        cwd: "../../",
        detached: true,
      });

      pnpm.stdout.on("data", (data) => {
        console.log("stdout: " + data);
      });

      pnpm.stderr.on("data", (data) => {
        console.log("stderr: " + data);
      });

      pnpm.on("error", (err) => {
        console.log("error: " + err);
        return reject(err);
      });

      pnpm.on("close", (code) => {
        console.log("exited with code: " + code);
        return resolve(code);
      });
    });
  }
}

module.exports = async function onStartup() {
  // Update
  const updateRes = await update();
  if (updateRes === UpdateResult.Updated) {
    // Build new
    // Override old if success
  }
  // Start application in production
  try {
    const code = await start();
    console.log(code);
    return true;
  } catch (err) {
    for (let i = 0; i < 5; ++i) {
      try {
        await start();
        setTimeout(5000);
        return true;
      } catch (err) {
        // Do nothing, try again
      }
    }
    return false;
  }
};
