const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

const listen = (server, port) =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });
const close = (server) => new Promise((resolve) => server.close(resolve));

async function run() {
  const source = path.join(__dirname, "..");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-backend-smoke-"));
  let requests = 0;
  const portProbe = http.createServer();
  const configer = http.createServer((req, res) => {
    assert.equal(req.url, "/api/v1/config/main");
    requests++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(requests === 1 ? null : legacyConfig));
  });
  const legacyConfig = {
    backend: { url: "/api/v1", port: 0 },
    pc: { os: "old-linux-image" },
    units: { engine: { ip: "127.0.0.1" }, thermal: { ip: "127.0.0.1" } },
    obsolete: { delay: null },
  };
  let child;
  let stopped;
  let log = "";
  try {
    fs.cpSync(path.join(source, "apps/backend/dist"), dir, { recursive: true });
    fs.copyFileSync(path.join(source, "apps/backend/package.json"), path.join(dir, "package.json"));
    fs.copyFileSync(path.join(source, "bun.lock"), path.join(dir, "bun.lock"));
    const install = spawnSync("bun", ["install", "--no-save"], { cwd: dir, stdio: "inherit" });
    if (install.error) throw install.error;
    assert.equal(install.status, 0);

    await listen(configer, 5001);
    await listen(portProbe, 0);
    const { port } = portProbe.address();
    await close(portProbe);
    child = spawn(process.execPath, ["index.js"], {
      cwd: dir,
      env: { ...process.env, PORT: String(port), NODE_ENV: "test", RESTART_ENABLED: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    stopped = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    child.stdout.on("data", (data) => {
      log += data;
    });
    child.stderr.on("data", (data) => {
      log += data;
    });
    for (let i = 0; i < 100; i++) {
      const response = await fetch("http://127.0.0.1:" + port + "/api/v1/status").catch(() => null);
      if (response?.ok) {
        await response.json();
        assert.equal(requests, 2);
        assert.match(log, /invalid backend fields: <root>/);
        console.log("Standalone backend rejected an invalid 200 and served after a valid retry.");
        return;
      }
      if (child.exitCode !== null) break;
      await delay(150);
    }
    throw new Error("Packaged backend did not recover:\n" + log);
  } finally {
    if (child) {
      child.kill();
      await stopped;
    }
    if (configer.listening) await close(configer);
    if (portProbe.listening) await close(portProbe);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
