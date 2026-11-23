// Start the same services as dev, selecting the muted mode only for the panel.
const { spawn } = require("child_process");

const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run this script through pnpm dev:local-ai");

const services = [
  ["babybox-panel-configer", "dev"],
  ["babybox-panel", "dev:local-ai"],
  ["babybox-panel-backend", "dev"],
];
const children = services.map(([name, script]) =>
  spawn(process.execPath, [pnpm, "--filter", name, script], {
    stdio: "inherit",
    detached: process.platform !== "win32",
  }),
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      try { process.kill(-child.pid, "SIGTERM"); } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
  }
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => { console.error(error); stop(1); });
  child.on("exit", (code, signal) => stop(code ?? (signal ? 1 : 0)));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
