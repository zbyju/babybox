// Install workspace dependencies before loading the Node startup app.
const { spawnSync } = require("child_process");
const os = require("os");
const path = require("path");
const bootstrap = require("./bootstrap");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
  }
  return result.status === null ? 1 : result.status;
}

async function install() {
  const code = await bootstrap.run();
  if (code !== 0) {
    return code;
  }

  const windows = process.platform === "win32";
  const bun = path.join(
    os.homedir(),
    ".bun",
    "bin",
    windows ? "bun.exe" : "bun"
  );
  const source = path.resolve(__dirname, "../..");
  const installed = run(bun, ["install", "--frozen-lockfile"], source);
  if (installed !== 0) {
    return installed;
  }

  return run(
    process.execPath,
    ["src/index.js", "--install", ...(windows ? [] : ["--ubuntu"])],
    __dirname
  );
}

install().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
