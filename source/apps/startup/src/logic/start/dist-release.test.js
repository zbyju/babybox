/* eslint-env jest */
const { EventEmitter } = require("events");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const fsExtra = require("fs-extra");

const { onStartup } = require("./dist-release");
const ubuntuStart = require("./ubuntu");
const windowsStart = require("./windows");

const WHEN = new Date(2026, 8, 23, 4, 5, 6);
const VERSIONS = { node: "v18.12.1", pnpm: "7.5.0", bun: "1.4.2" };
const HEAD_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function makeLogger() {
  const lines = [];
  const write = (level) => (stage, message, err) => {
    lines.push({ level, stage, message, err });
  };
  return {
    lines,
    info: write("info"),
    error: write("error"),
    warn: write("warn"),
  };
}

function createHarness() {
  const execCalls = [];
  const spawnCalls = [];
  const handlers = [];
  const spawnQueue = [];
  const logger = makeLogger();

  function on(command, run) {
    handlers.push({ command, run });
  }

  const defaults = {
    "git checkout -- pnpm-lock.yaml": () => ({ stdout: "", stderr: "" }),
    "git status --porcelain": () => ({ stdout: "", stderr: "" }),
    "git rev-parse HEAD": () => ({ stdout: `${HEAD_SHA}\n`, stderr: "" }),
  };

  async function exec(command, opts) {
    const cwd = opts ? opts.cwd : undefined;
    execCalls.push({ command, cwd });
    for (let i = 0; i < handlers.length; i += 1) {
      if (handlers[i].command === command) {
        return handlers[i].run(cwd, command);
      }
    }
    if (defaults[command]) {
      return defaults[command](cwd, command);
    }
    throw new Error(`unexpected exec ${command}`);
  }

  function spawn(cmd, args, opts) {
    spawnCalls.push({
      cmd,
      args,
      cwd: opts.cwd,
      shell: opts.shell,
    });
    const spec = spawnQueue.shift() || { code: 0 };
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    process.nextTick(() => {
      if (spec.stdout) {
        child.stdout.emit("data", spec.stdout);
      }
      if (spec.stderr) {
        child.stderr.emit("data", spec.stderr);
      }
      if (spec.error) {
        child.emit("error", new Error(spec.error));
        return;
      }
      child.emit("close", spec.code);
    });
    return child;
  }

  return { exec, spawn, execCalls, spawnCalls, spawnQueue, logger, on };
}

function writeBackendAndPanel(root) {
  const backendDist = path.join(root, "source", "apps", "backend", "dist");
  fs.mkdirSync(backendDist, { recursive: true });
  fs.writeFileSync(path.join(backendDist, "index.js"), "new");
  fs.writeFileSync(path.join(root, "source", "apps", "backend", ".env"), "A=1\n");
  fs.writeFileSync(
    path.join(root, "source", "apps", "backend", "package.json"),
    "{\"name\":\"babybox-panel-backend\"}\n"
  );
  fs.writeFileSync(path.join(root, "source", "bun.lock"), "{}\n");
  const panelDist = path.join(root, "source", "apps", "panel", "dist");
  fs.mkdirSync(panelDist, { recursive: true });
  fs.writeFileSync(path.join(panelDist, "index.html"), "panel");
}

function writeLiveDist(root) {
  const dist = path.join(root, "dist");
  fs.mkdirSync(path.join(dist, "node_modules"), { recursive: true });
  fs.writeFileSync(path.join(dist, "index.js"), "old");
  fs.writeFileSync(path.join(dist, "node_modules", "keep.txt"), "keep");
}

function createRoot(withLive) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-dist-next-"));
  writeBackendAndPanel(root);
  if (withLive !== false) {
    writeLiveDist(root);
  }
  return root;
}

function baseOptions(root, harness, extra) {
  return Object.assign(
    {
      repoRoot: root,
      logPath: path.join(root, "logs", "startup.log"),
      now: () => WHEN,
      versions: VERSIONS,
      platform: "linux",
      pnpm: "pnpm",
      exec: harness.exec,
      spawn: harness.spawn,
      logger: harness.logger,
      env: {},
      home: root,
      release: "5.15.0",
      arch: "x64",
      headSha: HEAD_SHA,
      bunVersion: "1.4.2",
      wantedBun: "1.4.2",
      bootstrapRun: async () => 0,
      httpGet: async () => 200,
    },
    extra
  );
}

function writeReleaseFile(root, sha) {
  fs.writeFileSync(
    path.join(root, "dist", "release.json"),
    `${JSON.stringify({ sha: sha || HEAD_SHA })}\n`
  );
}

function writeLast(root, record) {
  fs.mkdirSync(path.join(root, "logs"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "logs", "startup.last.json"),
    `${JSON.stringify(record)}\n`
  );
}

function allowPm2(harness) {
  harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
  harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
}

function alreadyCurrent(harness) {
  harness.on("git pull", () => ({
    stdout: "Already up to date.\n",
    stderr: "",
  }));
}

function holdBootstrap(line) {
  return async (opts) => {
    opts.stdout.write(`${line}\n`);
    return 1;
  };
}

function readRecord(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "logs", "startup.last.json"), "utf8")
  );
}

function installCwds(harness) {
  return harness.execCalls
    .filter((call) => call.command.indexOf("install") !== -1)
    .map((call) => call.cwd);
}

function commands(harness) {
  return harness.execCalls.map((call) => call.command);
}

function prepareRelease(harness) {
  harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
  harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
  harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
  allowPm2(harness);
}

function configDir(root) {
  return path.join(root, "source", "apps", "configer", "configs");
}

function writeConfig(root, name, value) {
  const dir = configDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const body = typeof value === "string" ? value : `${JSON.stringify(value)}\n`;
  fs.writeFileSync(path.join(dir, name), body);
}

function statusUrl(port, prefix) {
  const pathName = prefix ? `${prefix}/status` : "/status";
  return `http://127.0.0.1:${port}${pathName}`;
}

function manualClock() {
  let clock = 0;
  return {
    nowMs() {
      return clock;
    },
    async delay(ms) {
      clock += ms;
    },
    advance(ms) {
      clock += ms;
    },
  };
}

function missed(url, ms) {
  return `Adresa ${url} neodpověděla do ${ms} ms.`;
}

function listenStatus(readyPath) {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    if (req.url === readyPath) {
      res.statusCode = 200;
      res.end("ok");
      return;
    }
    res.statusCode = 404;
    res.end("no");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        hits,
        port: address.port,
      });
    });
  });
}
describe("dist-next release", () => {
  it("keeps the live dist until dist-next is installed, then swaps and starts both apps", async () => {
    const root = createRoot();
    const harness = createHarness();
    let distDuringInstall = "";
    let modulesDuringInstall = false;
    let dist2DuringInstall = true;
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", (cwd) => {
      if (cwd === path.join(root, "dist-next")) {
        distDuringInstall = fs.readFileSync(path.join(root, "dist", "index.js"), "utf8");
        modulesDuringInstall = fs.existsSync(
          path.join(root, "dist", "node_modules", "keep.txt")
        );
        dist2DuringInstall = fs.existsSync(path.join(root, "dist2"));
      }
      return { stdout: "", stderr: "" };
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(distDuringInstall).toBe("old");
      expect(modulesDuringInstall).toBe(true);
      expect(dist2DuringInstall).toBe(false);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("new");
      expect(fs.readFileSync(path.join(root, "dist", "public", "index.html"), "utf8")).toBe(
        "panel"
      );
      expect(fs.readFileSync(path.join(root, "dist", ".env"), "utf8")).toBe("A=1\n");
      expect(fs.readFileSync(path.join(root, "dist", "bun.lock"), "utf8")).toBe(
        fs.readFileSync(path.join(root, "source", "bun.lock"), "utf8")
      );
      expect(fs.readFileSync(path.join(root, "dist", "package.json"), "utf8")).toBe(
        fs.readFileSync(
          path.join(root, "source", "apps", "backend", "package.json"),
          "utf8"
        )
      );
      expect(fs.existsSync(path.join(root, "dist2", "index.js"))).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist2", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist2", "node_modules"))).toBe(false);
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
      expect(installCwds(harness)).toEqual([path.join(root, "dist-next")]);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
      harness.spawnCalls.forEach((call) => {
        expect(call.cmd).toBe("pnpm");
        expect(call.shell).toBe(false);
        expect(call.cwd).toBe(path.join(root, "source"));
      });
      expect(readRecord(root)).toEqual({
        step: "START_PANEL",
        ok: true,
        message: "",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
      expect(JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8"))).toEqual({
        sha: HEAD_SHA,
      });
      expect(harness.logger.lines.map((line) => line.message)).toEqual(
        expect.arrayContaining([
          "Krok DIST_PREPARE začíná.",
          "Krok DIST_PREPARE skončil.",
          "Krok SWAP začíná.",
          "Krok START_PANEL skončil.",
        ])
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("restores dist and starts both apps when configer fails to start", async () => {
    const root = createRoot();
    const harness = createHarness();
    let restoredIndex = "";
    harness.spawnQueue.push({ code: 1, stderr: "configer broke\n" });
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", (cwd) => {
      if (cwd === path.join(root, "dist")) {
        restoredIndex = fs.readFileSync(path.join(root, "dist", "index.js"), "utf8");
      }
      return { stdout: "", stderr: "" };
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(restoredIndex).toBe("old");
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist2"))).toBe(false);
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
      expect(installCwds(harness)).toEqual([
        path.join(root, "dist-next"),
        path.join(root, "dist"),
      ]);
      expect(installCwds(harness)).not.toContain(path.join(root, "source", "dist"));
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root)).toEqual({
        step: "START_CONFIGER",
        ok: false,
        message: "configer broke",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("records START_PANEL and restores dist when the panel fails to start", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    harness.spawnQueue.push({ code: 0 }, { code: 2, stderr: "panel broke\n" });
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe("panel broke");
      expect(installCwds(harness)[1]).toBe(path.join(root, "dist"));
      expect(JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")).sha).toBe(
        OTHER_SHA
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("starts the live dist unchanged when dist-next install fails", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => {
      const err = new Error("install failed");
      err.stderr = "install failed\n";
      throw err;
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist", "node_modules", "keep.txt"))).toBe(
        true
      );
      expect(fs.existsSync(path.join(root, "dist2"))).toBe(false);
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
      expect(installCwds(harness)).toEqual([path.join(root, "dist-next")]);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root).step).toBe("DIST_PREPARE");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe("install failed");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not assemble dist-next when the build fails", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => {
      writeLast(root, {
        step: "BUILD_PANEL",
        ok: false,
        message: "schema broke",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
      return { stdout: "", stderr: "schema broke\n" };
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
      expect(commands(harness)).not.toContain("bun install --no-save");
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root).step).toBe("BUILD_PANEL");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe("schema broke");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("stops when the first install has no previous dist and the new apps do not start", async () => {
    const root = createRoot(false);
    const harness = createHarness();
    harness.spawnQueue.push({ code: 1, stderr: "configer broke\n" });
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(false);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("new");
      expect(fs.existsSync(path.join(root, "dist2"))).toBe(false);
      expect(installCwds(harness)).toEqual([path.join(root, "dist-next")]);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([["start:configer"]]);
      expect(readRecord(root).step).toBe("START_CONFIGER");
      expect(readRecord(root).ok).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when the last step failed even if the checkout is already current", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    writeLast(root, {
      step: "BUILD_PANEL",
      ok: false,
      message: "old",
      at: WHEN.toISOString(),
      node: VERSIONS.node,
      pnpm: VERSIONS.pnpm,
      bun: VERSIONS.bun,
    });
    harness.on("git pull", () => ({
      stdout: "Already up to date.\n",
      stderr: "",
    }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("puts the live dist back when the swap cannot finish", async () => {
    const root = createRoot();
    const harness = createHarness();
    const trackingFs = Object.create(fsExtra);
    trackingFs.renameSync = (from, to) => {
      if (String(from).endsWith(`${path.sep}dist-next`)) {
        throw new Error("rename dist-next failed");
      }
      return fsExtra.renameSync(from, to);
    };
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          fs: trackingFs,
        })
      );
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist2"))).toBe(false);
      expect(readRecord(root).step).toBe("SWAP");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toContain("rename dist-next failed");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds on Ubuntu when the configer dist is missing", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    harness.on("git pull", () => ({
      stdout: "Already up to date.\n",
      stderr: "",
    }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "nope\n" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      await ubuntuStart(baseOptions(root, harness));
      expect(commands(harness)).toContain("pnpm run build");
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses pnpm.cmd on Windows and skips the build when only configer dist is missing", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    harness.on("git pull", () => ({
      stdout: "Already up to date.\n",
      stderr: "",
    }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const opts = baseOptions(root, harness);
      delete opts.pnpm;
      const code = await windowsStart(opts);
      expect(code).toBe(true);
      expect(commands(harness)).not.toContain("pnpm.cmd run build");
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(harness.spawnCalls.map((call) => call.cmd)).toEqual([
        "pnpm.cmd",
        "pnpm.cmd",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("starts the panel when the restored configer also fails", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.spawnQueue.push(
      { code: 1, stderr: "configer broke\n" },
      { code: 1, stderr: "restored configer broke\n" }
    );
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(false);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root)).toEqual({
        step: "START_CONFIGER",
        ok: false,
        message: "configer broke",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("starts both apps when install of the restored dist throws", async () => {
    const root = createRoot();
    const harness = createHarness();
    let spawnsAtRestoreInstall = -1;
    harness.spawnQueue.push({ code: 1, stderr: "configer broke\n" });
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", (cwd) => {
      if (cwd === path.join(root, "dist")) {
        spawnsAtRestoreInstall = harness.spawnCalls.length;
        throw new Error("restore install failed");
      }
      return { stdout: "", stderr: "" };
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(spawnsAtRestoreInstall).toBe(1);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns false when the build fails and there is no live dist", async () => {
    const root = createRoot(false);
    const harness = createHarness();
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "schema broke\n" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(false);
      expect(harness.spawnCalls).toEqual([]);
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when there is no live dist and the checkout is already current", async () => {
    const root = createRoot(false);
    const harness = createHarness();
    harness.on("git pull", () => ({
      stdout: "Already up to date.\n",
      stderr: "",
    }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(commands(harness)).toContain("pnpm run build");
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("new");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("starts the live dist when git pull throws", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.on("git pull", () => {
      throw new Error("pull failed");
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("installs dist-next at the default repo root when repoRoot is omitted", async () => {
    const root = createRoot(false);
    const harness = createHarness();
    const repoRoot = path.resolve(__dirname, "../../../../../..");
    const fakeFs = {
      existsSync(target) {
        return (
          target === path.join(repoRoot, "source", "apps", "backend", "dist") ||
          target === path.join(repoRoot, "source", "apps", "panel", "dist") ||
          target === path.join(repoRoot, "dist")
        );
      },
      copySync() {},
      copyFileSync() {},
      rmSync() {},
      renameSync() {},
    };
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const opts = baseOptions(root, harness, { fs: fakeFs });
      delete opts.repoRoot;
      await onStartup(opts);
      expect(installCwds(harness)).toContain(
        path.resolve(__dirname, "../../../../../../dist-next")
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips the build on Ubuntu when the configer dist exists", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    const configerDist = path.join(root, "source", "apps", "configer", "dist");
    fs.mkdirSync(configerDist, { recursive: true });
    fs.writeFileSync(path.join(configerDist, "index.js"), "configer");
    harness.on("git pull", () => ({
      stdout: "Already up to date.\n",
      stderr: "",
    }));
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      await ubuntuStart(baseOptions(root, harness));
      expect(commands(harness)).not.toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("finishes the swap when node_modules would block rename", async () => {
    const root = createRoot();
    const harness = createHarness();
    const trackingFs = Object.create(fsExtra);
    trackingFs.renameSync = (from, to) => {
      if (fs.existsSync(path.join(from, "node_modules"))) {
        throw new Error("node_modules blocks rename");
      }
      return fsExtra.renameSync(from, to);
    };
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", (cwd) => {
      if (cwd === path.join(root, "dist-next")) {
        fs.mkdirSync(path.join(cwd, "node_modules"), { recursive: true });
        fs.writeFileSync(path.join(cwd, "node_modules", "keep.txt"), "keep");
      }
      return { stdout: "", stderr: "" };
    });
    harness.on("pm2 delete configer", () => ({ stdout: "", stderr: "" }));
    harness.on("pm2 delete babybox", () => ({ stdout: "", stderr: "" }));
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          fs: trackingFs,
        })
      );
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("new");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("bootstraps after the lockfile restore and before git pull", async () => {
    const root = createRoot();
    const harness = createHarness();
    const order = [];
    writeReleaseFile(root);
    harness.on("git checkout -- pnpm-lock.yaml", () => {
      order.push("checkout");
      return { stdout: "", stderr: "" };
    });
    harness.on("git status --porcelain", () => {
      order.push("status");
      return { stdout: "", stderr: "" };
    });
    harness.on("git pull", () => {
      order.push("pull");
      return { stdout: "Already up to date.\n", stderr: "" };
    });
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          bootstrapRun: async () => {
            order.push("bootstrap");
            return 0;
          },
        })
      );
      expect(code).toBe(true);
      expect(order).toEqual(["checkout", "status", "bootstrap", "pull"]);
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(readRecord(root)).toEqual({
        step: "BOOTSTRAP_BUN",
        ok: true,
        message: "",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when the pull is already current and release.json is not HEAD", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
      expect(commands(harness)[0]).toBe("git checkout -- pnpm-lock.yaml");
      expect(commands(harness).indexOf("git pull")).toBeGreaterThan(
        commands(harness).indexOf("git status --porcelain")
      );
      expect(
        JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8"))
      ).toEqual({ sha: HEAD_SHA });
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("new");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds on Windows when release.json is not HEAD", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    alreadyCurrent(harness);
    harness.on("pnpm.cmd run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const opts = baseOptions(root, harness, { platform: "win32" });
      delete opts.pnpm;
      const code = await windowsStart(opts);
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm.cmd run build");
      expect(harness.spawnCalls.map((call) => call.cmd)).toEqual([
        "pnpm.cmd",
        "pnpm.cmd",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("asks git for HEAD when the caller does not pass a sha", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const opts = baseOptions(root, harness);
      delete opts.headSha;
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(commands(harness)).toContain("git rev-parse HEAD");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")).sha
      ).toBe(HEAD_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips the build on OS_HOLD while that release is still a hold", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    alreadyCurrent(harness);
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          platform: "win32",
          release: "6.2.9200",
          bootstrapRun: holdBootstrap(
            "Tento systém nespustí Bun. Krok OS_HOLD. Vydání 6.2.9200."
          ),
        })
      );
      expect(code).toBe(true);
      expect(commands(harness)).toContain("git pull");
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(readRecord(root).step).toBe("OS_HOLD");
      expect(readRecord(root).ok).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when an OS_HOLD record is left on an OS that can run Bun", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    writeLast(root, {
      step: "OS_HOLD",
      ok: true,
      message: "old hold",
      at: WHEN.toISOString(),
      node: VERSIONS.node,
      pnpm: VERSIONS.pnpm,
      bun: VERSIONS.bun,
    });
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          platform: "win32",
          release: "10.0.22621",
        })
      );
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")).sha
      ).toBe(HEAD_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips the build on CPU_HOLD when cpu-hold matches the pin", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    fs.mkdirSync(path.join(root, ".bun"), { recursive: true });
    fs.writeFileSync(path.join(root, ".bun", "cpu-hold"), "1.4.2\n");
    alreadyCurrent(harness);
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          bootstrapRun: holdBootstrap("Procesor nespustí Bun. Krok CPU_HOLD."),
        })
      );
      expect(code).toBe(true);
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(readRecord(root).step).toBe("CPU_HOLD");
      expect(readRecord(root).ok).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when cpu-hold names an older pin than BUN_VERSION", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    fs.mkdirSync(path.join(root, ".bun"), { recursive: true });
    fs.writeFileSync(path.join(root, ".bun", "cpu-hold"), "1.4.0\n");
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          bootstrapRun: holdBootstrap("Procesor nespustí Bun. Krok CPU_HOLD."),
        })
      );
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("builds when bun -v is not the pinned version", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, { bunVersion: "1.0.0" })
      );
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads bun -v from the user profile when the caller does not pass it", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    const bin = path.join(root, ".bun", "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "bun"), "#!/bin/sh\n");
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const opts = baseOptions(root, harness, {
        spawnSync: () => ({ status: 0, stdout: "0.0.1\n" }),
      });
      delete opts.bunVersion;
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips the build when the probed bun matches the pin and release.json matches", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root);
    const bin = path.join(root, ".bun", "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "bun"), "#!/bin/sh\n");
    alreadyCurrent(harness);
    allowPm2(harness);
    try {
      const opts = baseOptions(root, harness, {
        spawnSync: () => ({ status: 0, stdout: "v1.4.2\n" }),
      });
      delete opts.bunVersion;
      delete opts.wantedBun;
      opts.versionsPath = path.join(
        __dirname,
        "../../../versions.env"
      );
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(commands(harness)).not.toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("records a dirty tree and does not pull or build", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.on("git status --porcelain", () => ({
      stdout: " M pnpm-lock.yaml\n",
      stderr: "",
    }));
    allowPm2(harness);
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(commands(harness).slice(0, 2)).toEqual([
        "git checkout -- pnpm-lock.yaml",
        "git status --porcelain",
      ]);
      expect(commands(harness)).not.toContain("git pull");
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(readRecord(root).step).toBe("PULL");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toContain("pnpm-lock.yaml");
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("starts the live dist when the lockfile checkout fails", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.on("git checkout -- pnpm-lock.yaml", () => {
      const err = new Error("checkout failed");
      err.stderr = "checkout failed\n";
      throw err;
    });
    allowPm2(harness);
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(commands(harness)[0]).toBe("git checkout -- pnpm-lock.yaml");
      expect(commands(harness)).not.toContain("git pull");
      expect(commands(harness)).not.toContain("pnpm run build");
      expect(readRecord(root).step).toBe("PULL");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe("checkout failed");
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("names BOOTSTRAP_BUN and keeps the previous dist when that step fails", async () => {
    const root = createRoot();
    const harness = createHarness();
    writeReleaseFile(root, OTHER_SHA);
    alreadyCurrent(harness);
    harness.on("pnpm run build", () => {
      writeLast(root, {
        step: "BOOTSTRAP_BUN",
        ok: false,
        message: "Kontrolní součet archivu Bun se neshoduje.",
        at: WHEN.toISOString(),
        node: VERSIONS.node,
        pnpm: VERSIONS.pnpm,
        bun: VERSIONS.bun,
      });
      return { stdout: "", stderr: "checksum\n" };
    });
    allowPm2(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          bootstrapRun: holdBootstrap(
            "Kontrolní součet archivu Bun se neshoduje."
          ),
        })
      );
      expect(code).toBe(true);
      expect(commands(harness)).toContain("pnpm run build");
      expect(readRecord(root).step).toBe("BOOTSTRAP_BUN");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toContain("Kontrolní součet");
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe("old");
      expect(fs.existsSync(path.join(root, "dist-next"))).toBe(false);
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps START_PANEL success when release.json cannot be written", async () => {
    const root = createRoot();
    const harness = createHarness();
    const trackingFs = Object.create(fsExtra);
    trackingFs.writeFileSync = (file, data) => {
      if (String(file).endsWith(`${path.sep}release.json`)) {
        throw new Error("disk full");
      }
      return fsExtra.writeFileSync(file, data);
    };
    harness.on("git pull", () => ({ stdout: "Updating abc\n", stderr: "" }));
    harness.on("pnpm run build", () => ({ stdout: "", stderr: "" }));
    harness.on("bun install --no-save", () => ({ stdout: "", stderr: "" }));
    allowPm2(harness);
    try {
      const code = await onStartup(baseOptions(root, harness, { fs: trackingFs }));
      expect(code).toBe(true);
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(true);
      expect(fs.existsSync(path.join(root, "dist", "release.json"))).toBe(false);
      expect(harness.logger.lines.map((line) => line.message)).toContain(
        "Soubor release.json se nepodařilo zapsat."
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rolls back when configer exits 0 and never answers status", async () => {
    const root = createRoot();
    const harness = createHarness();
    const clock = manualClock();
    const budget = 30000;
    const url = statusUrl(5001, "/api/v1");
    writeReleaseFile(root, OTHER_SHA);
    prepareRelease(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          nowMs: clock.nowMs,
          delay: clock.delay,
          httpGet: async (target) => {
            expect(target).toBe(url);
            clock.advance(budget);
            throw new Error("down");
          },
        })
      );
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe(
        "old"
      );
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root).step).toBe("START_CONFIGER");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe(missed(url, budget));
      expect(
        harness.logger.lines.find(
          (line) => line.stage === "START_CONFIGER" && line.level === "error"
        ).message
      ).toBe("Krok START_CONFIGER se nezdařil.");
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rolls back when the panel exits 0 and the backend never answers status", async () => {
    const root = createRoot();
    const harness = createHarness();
    const clock = manualClock();
    const budget = 30000;
    const configer = statusUrl(5001, "/api/v1");
    const backend = statusUrl(5000, "/api/v1");
    writeReleaseFile(root, OTHER_SHA);
    prepareRelease(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          nowMs: clock.nowMs,
          delay: clock.delay,
          httpGet: async (target) => {
            if (target === configer) {
              return 200;
            }
            expect(target).toBe(backend);
            clock.advance(budget);
            return 404;
          },
        })
      );
      expect(code).toBe(true);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe(
        "old"
      );
      expect(harness.spawnCalls.map((call) => call.args)).toEqual([
        ["start:configer"],
        ["start:main"],
        ["start:configer"],
        ["start:main"],
      ]);
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe(missed(backend, budget));
      expect(
        harness.logger.lines.find(
          (line) => line.stage === "START_PANEL" && line.level === "error"
        ).message
      ).toBe("Krok START_PANEL se nezdařil.");
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("records START_CONFIGER when configer dies after the panel answers", async () => {
    const root = createRoot();
    const harness = createHarness();
    const clock = manualClock();
    const budget = 30000;
    const configer = statusUrl(5001, "/api/v1");
    const backend = statusUrl(5000, "/api/v1");
    let configerHits = 0;
    const releaseSeen = [];
    writeReleaseFile(root, OTHER_SHA);
    prepareRelease(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          nowMs: clock.nowMs,
          delay: clock.delay,
          httpGet: async (target) => {
            releaseSeen.push(
              fs.existsSync(path.join(root, "dist", "release.json"))
            );
            if (target === backend) {
              return 200;
            }
            configerHits += 1;
            if (configerHits > 1) {
              clock.advance(budget);
              throw new Error("down");
            }
            return 200;
          },
        })
      );
      expect(code).toBe(true);
      expect(configerHits).toBe(2);
      expect(releaseSeen).toEqual([false, false, false]);
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe(
        "old"
      );
      expect(readRecord(root).step).toBe("START_CONFIGER");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe(missed(configer, budget));
      expect(
        harness.logger.lines.find(
          (line) => line.stage === "START_CONFIGER" && line.level === "error"
        ).message
      ).toBe("Krok START_CONFIGER se nezdařil.");
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes release.json only after both status routes answer", async () => {
    const root = createRoot();
    const harness = createHarness();
    const configerPort = 5002;
    const backendPort = 5003;
    const prefix = "/box";
    const configer = statusUrl(configerPort, prefix);
    const backend = statusUrl(backendPort, prefix);
    const seen = [];
    const releaseSeen = [];
    writeConfig(root, "main.json", {
      configer: { port: configerPort, url: prefix },
      backend: { port: backendPort, url: prefix },
    });
    prepareRelease(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            releaseSeen.push(
              fs.existsSync(path.join(root, "dist", "release.json"))
            );
            return 200;
          },
        })
      );
      expect(code).toBe(true);
      expect(seen).toEqual([configer, backend, configer]);
      expect(releaseSeen).toEqual([false, false, false]);
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(true);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        )
      ).toEqual({
        sha: HEAD_SHA,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("probes the default ports and prefix when no config file exists", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen).toEqual([
        statusUrl(5001, "/api/v1"),
        statusUrl(5000, "/api/v1"),
        statusUrl(5001, "/api/v1"),
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps base.json ports when main.json only sets the babybox name", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    writeConfig(root, "base.json", {
      configer: { port: 5001, url: "/api/v1" },
      backend: { port: 5000, url: "/api/v1" },
    });
    writeConfig(root, "main.json", { babybox: { name: "Praha" } });
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen[0]).toBe(statusUrl(5001, "/api/v1"));
      expect(seen[1]).toBe(statusUrl(5000, "/api/v1"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads ports from main.json.bak when main.json is not an object", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    writeConfig(root, "base.json", {
      configer: { port: 5001, url: "/api/v1" },
      backend: { port: 5000, url: "/api/v1" },
    });
    writeConfig(root, "main.json", "{");
    writeConfig(root, "main.json.bak", {
      configer: { port: 5008, url: "/bak" },
      backend: { port: 5009, url: "/bak" },
    });
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen[0]).toBe(statusUrl(5008, "/bak"));
      expect(seen[1]).toBe(statusUrl(5009, "/bak"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("probes /status when the stored prefix is not a valid route", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    writeConfig(root, "base.json", {
      configer: { port: 5001, url: "/api/v1" },
      backend: { port: 5000, url: "/api/v1" },
    });
    writeConfig(root, "main.json", { configer: { url: "/api/v1?" } });
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen[0]).toBe(statusUrl(5001, ""));
      expect(seen[1]).toBe(statusUrl(5000, "/api/v1"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses PORT and API_PREFIX when the stored port and prefix are empty", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    writeConfig(root, "base.json", {
      configer: { port: 5001, url: "/api/v1" },
      backend: { port: 5000, url: "/api/v1" },
    });
    writeConfig(root, "main.json", {
      configer: { port: 0, url: "" },
      backend: { port: 5000, url: "/api/v1" },
    });
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          env: { PORT: "5010", API_PREFIX: "/from-env" },
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen[0]).toBe(statusUrl(5010, "/from-env"));
      expect(seen[1]).toBe(statusUrl(5000, "/api/v1"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("retries status until a later answer is 200", async () => {
    const root = createRoot();
    const harness = createHarness();
    const clock = manualClock();
    let configerHits = 0;
    const requestLimits = [];
    const pauses = [];
    prepareRelease(harness);
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          nowMs: clock.nowMs,
          delay: async (ms) => {
            pauses.push(ms);
            await clock.delay(ms);
          },
          httpGet: async (target, limitMs) => {
            requestLimits.push(limitMs);
            if (target === statusUrl(5001, "/api/v1")) {
              configerHits += 1;
              if (configerHits === 1) {
                return 404;
              }
            }
            return 200;
          },
        })
      );
      expect(code).toBe(true);
      expect(configerHits).toBe(3);
      expect(pauses).toEqual([250]);
      expect(requestLimits).toEqual([1000, 1000, 1000, 1000]);
      expect(readRecord(root).ok).toBe(true);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(HEAD_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("ends the status wait when the request never returns", async () => {
    const root = createRoot();
    const harness = createHarness();
    const budget = 50;
    writeReleaseFile(root, OTHER_SHA);
    prepareRelease(harness);
    const started = Date.now();
    try {
      const code = await onStartup(
        baseOptions(root, harness, {
          statusWaitMs: budget,
          httpGet: () => new Promise(() => {}),
        })
      );
      expect(Date.now() - started).toBeLessThan(500);
      expect(code).toBe(true);
      expect(readRecord(root).step).toBe("START_CONFIGER");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe(
        missed(statusUrl(5001, "/api/v1"), budget)
      );
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe(
        "old"
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("still records START_PANEL when the runner writes stderr and status answers", async () => {
    const root = createRoot();
    const harness = createHarness();
    harness.spawnQueue.push(
      { code: 0, stderr: "pm2 warn\n" },
      { code: 0, stderr: "dotenv loaded .env\n" }
    );
    prepareRelease(harness);
    try {
      const code = await onStartup(baseOptions(root, harness));
      expect(code).toBe(true);
      expect(readRecord(root).step).toBe("START_PANEL");
      expect(readRecord(root).ok).toBe(true);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(HEAD_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not probe status when the live dist starts without a swap", async () => {
    const root = createRoot();
    const harness = createHarness();
    let probed = false;
    writeReleaseFile(root);
    const bin = path.join(root, ".bun", "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "bun"), "#!/bin/sh\n");
    alreadyCurrent(harness);
    allowPm2(harness);
    try {
      const opts = baseOptions(root, harness, {
        spawnSync: () => ({ status: 0, stdout: "v1.4.2\n" }),
        httpGet: async () => {
          probed = true;
          return 200;
        },
      });
      delete opts.bunVersion;
      delete opts.wantedBun;
      opts.versionsPath = path.join(__dirname, "../../../versions.env");
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(probed).toBe(false);
      expect(commands(harness)).not.toContain("pnpm run build");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses the real HTTP client against the bound status routes", async () => {
    const root = createRoot();
    const harness = createHarness();
    const readyPath = "/api/v1/status";
    const configer = await listenStatus(readyPath);
    const backend = await listenStatus(readyPath);
    writeConfig(root, "main.json", {
      configer: { port: configer.port, url: "/api/v1" },
      backend: { port: backend.port, url: "/api/v1" },
    });
    prepareRelease(harness);
    try {
      const opts = baseOptions(root, harness);
      delete opts.httpGet;
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(configer.hits).toEqual([readyPath, readyPath]);
      expect(backend.hits).toEqual([readyPath]);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(HEAD_SHA);
    } finally {
      await new Promise((resolve) => configer.server.close(resolve));
      await new Promise((resolve) => backend.server.close(resolve));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rolls back when nothing listens on the configer port", async () => {
    const root = createRoot();
    const harness = createHarness();
    const budget = 300;
    const closed = await listenStatus("/api/v1/status");
    await new Promise((resolve) => closed.server.close(resolve));
    writeConfig(root, "main.json", {
      configer: { port: closed.port, url: "/api/v1" },
    });
    writeReleaseFile(root, OTHER_SHA);
    prepareRelease(harness);
    try {
      const opts = baseOptions(root, harness, { statusWaitMs: budget });
      delete opts.httpGet;
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(readRecord(root).step).toBe("START_CONFIGER");
      expect(readRecord(root).ok).toBe(false);
      expect(readRecord(root).message).toBe(
        missed(statusUrl(closed.port, "/api/v1"), budget)
      );
      expect(fs.readFileSync(path.join(root, "dist", "index.js"), "utf8")).toBe(
        "old"
      );
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "dist", "release.json"), "utf8")
        ).sha
      ).toBe(OTHER_SHA);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("retries after a 404 from the real HTTP client", async () => {
    const root = createRoot();
    const harness = createHarness();
    const readyPath = "/api/v1/status";
    let configerHits = 0;
    const configer = {
      server: http.createServer((req, res) => {
        configerHits += 1;
        res.statusCode = configerHits === 1 ? 404 : 200;
        res.end("x");
      }),
    };
    await new Promise((resolve) =>
      configer.server.listen(0, "127.0.0.1", resolve)
    );
    const backend = await listenStatus(readyPath);
    writeConfig(root, "main.json", {
      configer: { port: configer.server.address().port, url: "/api/v1" },
      backend: { port: backend.port, url: "/api/v1" },
    });
    prepareRelease(harness);
    try {
      const opts = baseOptions(root, harness);
      delete opts.httpGet;
      const code = await onStartup(opts);
      expect(code).toBe(true);
      expect(configerHits).toBe(3);
      expect(readRecord(root).ok).toBe(true);
    } finally {
      await new Promise((resolve) => configer.server.close(resolve));
      await new Promise((resolve) => backend.server.close(resolve));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses the app port fallbacks when a config file sets no ports", async () => {
    const root = createRoot();
    const harness = createHarness();
    const seen = [];
    writeConfig(root, "base.json", {});
    prepareRelease(harness);
    try {
      await onStartup(
        baseOptions(root, harness, {
          httpGet: async (target) => {
            seen.push(target);
            return 200;
          },
        })
      );
      expect(seen[0]).toBe(statusUrl(6000, ""));
      expect(seen[1]).toBe(statusUrl(5000, ""));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps dist-release.js free of nullish and optional chains", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "dist-release.js"),
      "utf8"
    );
    expect(source.includes("??")).toBe(false);
    expect(source.includes("?.")).toBe(false);
  });
});
