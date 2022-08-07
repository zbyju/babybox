const util = require("util");
const exec = util.promisify(require("child_process").exec);

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
  console.log("start");
  try {
    const { stdout, stderr } = await exec("pnpm run start", { cwd: "../../" });
    console.log(stdout);
    if (stderr) return UpdateResult.Error;
    if (stdout === "Already up to date") return UpdateResult.Unchanged;
    return UpdateResult.Updated;
  } catch (err) {
    console.log("error: " + err);
    return UpdateResult.Error;
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
  const startRes = await start();
  console.log(startRes);
};
