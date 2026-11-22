// Fresh installs share the build runner's pinned, frozen Bun install.
const { spawnSync } = require("child_process");
const os = require("os");
const path = require("path");
const bootstrap = require("./bootstrap");

async function install() {
  const env = Object.assign({}, process.env);
  const prepared = await bootstrap.run({ env });
  if (prepared !== 0) return prepared;

  const exe = process.platform === "win32" ? "bun.exe" : "bun";
  const bun = path.join(os.homedir(), ".bun", "bin", exe);
  const result = spawnSync(bun, ["install", "--frozen-lockfile"], {
    cwd: path.resolve(__dirname, "../.."),
    env,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  return result.status === null ? 1 : result.status;
}

install().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(err);
    process.exitCode = 1;
  }
);
