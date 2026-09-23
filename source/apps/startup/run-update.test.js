/* eslint-env jest */
const fs = require("fs");
const os = require("os");
const path = require("path");

const { run: runBootstrap } = require("./bootstrap");
const { run } = require("./run-update");

const REAL_VERSIONS = path.join(__dirname, "versions.env");
const ROOT_PACKAGE = path.join(__dirname, "../../package.json");

const WHEN = new Date(2026, 8, 22, 1, 2, 3);

const STEP_ARGS = [
  ["install", "--frozen-lockfile"],
  ["run", "build:schema"],
  ["-F", "babybox-panel", "build"],
  ["-F", "babybox-panel-backend", "build"],
  ["-F", "babybox-panel-configer", "build"],
];

function makeStream() {
  const chunks = [];
  return {
    text: () => chunks.join(""),
    write(chunk) {
      chunks.push(String(chunk));
      return true;
    },
  };
}

function placeBun(home) {
  const exe = path.join(home, ".bun", "bin", "bun");
  fs.mkdirSync(path.dirname(exe), { recursive: true });
  fs.writeFileSync(exe, "bun");
  return exe;
}

function matchingBootstrapSpawn() {
  return (cmd) => {
    if (cmd.endsWith(`${path.sep}bun`) || cmd.endsWith(`${path.sep}bun.exe`)) {
      return { status: 0, signal: null, stdout: "1.4.2\n", stderr: "" };
    }
    if (cmd === "pm2") {
      return { status: 0, signal: null, stdout: "7.0.4\n", stderr: "" };
    }
    throw new Error(`unexpected bootstrap spawn ${cmd}`);
  };
}

function createFixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-run-home-"));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-run-root-"));
  const logPath = path.join(root, "startup.log");
  const stdout = makeStream();
  const stderr = makeStream();
  const env = Object.assign({}, process.env);
  return {
    home,
    root,
    logPath,
    stdout,
    stderr,
    env,
    logText: () =>
      fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "",
    last() {
      return JSON.parse(
        fs.readFileSync(path.join(root, "startup.last.json"), "utf8")
      );
    },
    cleanup() {
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function baseOptions(fx, extra) {
  return Object.assign(
    {
      home: fx.home,
      logPath: fx.logPath,
      env: fx.env,
      stdout: fx.stdout,
      stderr: fx.stderr,
      cwd: path.join(fx.root, "source"),
      now: () => new Date(2026, 8, 22, 1, 2, 3),
      platform: "linux",
      arch: "x64",
      release: "5.15.0-generic",
      versionsPath: REAL_VERSIONS,
      versions: { node: "v18.12.1", pnpm: "7.5.0", bun: "1.4.2" },
    },
    extra
  );
}

describe("root build script", () => {
  it("points build at apps/startup/run-update.js", () => {
    const pkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE, "utf8"));
    expect(pkg.scripts.build).toBe("node apps/startup/run-update.js");
  });
});

describe("run-update", () => {
  it("stops on OS_HOLD before pnpm install and writes no stderr", async () => {
    const fx = createFixture();
    const spawnSync = () => {
      throw new Error("pnpm must not run on OS_HOLD");
    };
    try {
      const code = await run(
        baseOptions(fx, {
          platform: "win32",
          release: "6.2.9200",
          bootstrapRun: runBootstrap,
          spawnSync,
        })
      );
      expect(code).toBe(1);
      expect(fx.stderr.text()).toBe("");
      expect(fx.stdout.text()).toContain("Krok OS_HOLD");
      expect(fx.stdout.text()).not.toContain("nezdařil");
      expect(fx.logText()).toContain("Krok OS_HOLD");
      expect(fx.last()).toEqual({
        step: "OS_HOLD",
        ok: true,
        message: "Tento systém nespustí Bun. Krok OS_HOLD. Vydání 6.2.9200.",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("runs pnpm install and each package build after Bun is on PATH", async () => {
    const fx = createFixture();
    placeBun(fx.home);
    // A later success replaces a stale failure record.
    fs.writeFileSync(
      path.join(fx.root, "startup.last.json"),
      "{\"step\":\"BUILD_PANEL\",\"ok\":false,\"message\":\"old\"}\n"
    );
    const calls = [];
    const paths = [];
    const spawnSync = (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      paths.push(String(opts.env.PATH));
      return { status: 0, stdout: "", stderr: "" };
    };
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: runBootstrap,
          bootstrapSpawn: matchingBootstrapSpawn(),
          spawnSync,
        })
      );
      expect(code).toBe(0);
      expect(fx.stderr.text()).toBe("");
      expect(calls.map((call) => call.cmd)).toEqual([
        "pnpm",
        "pnpm",
        "pnpm",
        "pnpm",
        "pnpm",
      ]);
      expect(calls.map((call) => call.args)).toEqual(STEP_ARGS);
      calls.forEach((call) => {
        expect(call.opts.shell).toBe(false);
        expect(call.opts.cwd).toBe(path.join(fx.root, "source"));
        expect(call.opts.env).toBe(fx.env);
      });
      const binDir = path.join(fx.home, ".bun", "bin");
      expect(paths[0].indexOf(binDir)).toBe(0);
      expect(fx.stdout.text()).toContain(
        "22.09.2026 01:02:03 INFO [run-update] Krok INSTALL začíná."
      );
      expect(fx.stdout.text()).toContain("Krok BUILD_CONFIGER skončil.");
      expect(fx.logText()).toContain("Krok INSTALL skončil.");
      expect(fx.logText()).not.toContain("pnpm");
      expect(fx.last()).toEqual({
        step: "BUILD_CONFIGER",
        ok: true,
        message: "",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("calls pnpm.cmd on Windows", async () => {
    const fx = createFixture();
    const calls = [];
    try {
      const code = await run(
        baseOptions(fx, {
          platform: "win32",
          release: "10.0.19045",
          bootstrapRun: async () => 0,
          spawnSync: (cmd, args, opts) => {
            calls.push({ cmd, args, opts });
            return { status: 0, stdout: "", stderr: "" };
          },
        })
      );
      expect(code).toBe(0);
      expect(calls.map((call) => call.cmd)).toEqual([
        "pnpm.cmd",
        "pnpm.cmd",
        "pnpm.cmd",
        "pnpm.cmd",
        "pnpm.cmd",
      ]);
      calls.forEach((call) => {
        expect(call.opts.shell).toBe(false);
      });
    } finally {
      fx.cleanup();
    }
  });

  it("still names a bootstrap failure when an old OS_HOLD record is on disk", async () => {
    const fx = createFixture();
    fs.writeFileSync(
      path.join(fx.root, "startup.last.json"),
      "{\"step\":\"OS_HOLD\",\"ok\":true}\n"
    );
    const spawnSync = () => {
      throw new Error("pnpm must not run");
    };
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => 1,
          spawnSync,
        })
      );
      expect(code).toBe(1);
      expect(fx.stdout.text()).toContain("Krok BOOTSTRAP_BUN se nezdařil.");
      expect(fx.last().step).toBe("BOOTSTRAP_BUN");
      expect(fx.last().ok).toBe(false);
    } finally {
      fx.cleanup();
    }
  });

  it("does not name CPU_HOLD as a bootstrap failure", async () => {
    const fx = createFixture();
    const previous = "{\"step\":\"CPU_HOLD\",\"ok\":true}\n";
    fs.writeFileSync(path.join(fx.root, "startup.last.json"), previous);
    const spawnSync = () => {
      throw new Error("pnpm must not run");
    };
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async (opts) => {
            opts.stdout.write(
              "22.09.2026 01:02:03 INFO [bootstrap] Procesor nespustí Bun. Krok CPU_HOLD.\n"
            );
            return 1;
          },
          spawnSync,
        })
      );
      expect(code).toBe(1);
      expect(fx.stderr.text()).toBe("");
      expect(fx.stdout.text()).toContain("Krok CPU_HOLD");
      expect(fx.stdout.text()).not.toContain("nezdařil");
      expect(
        fs.readFileSync(path.join(fx.root, "startup.last.json"), "utf8")
      ).toBe(previous);
    } finally {
      fx.cleanup();
    }
  });

  it("stops the chain when a step exits non-zero", async () => {
    const fx = createFixture();
    const calls = [];
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => 0,
          spawnSync: (cmd, args) => {
            calls.push(args);
            if (args[0] === "run") {
              return {
                status: 2,
                stdout: "schema out\n",
                stderr: "schema broke\n",
              };
            }
            return { status: 0, stdout: "", stderr: "" };
          },
        })
      );
      expect(code).toBe(2);
      expect(calls).toEqual(STEP_ARGS.slice(0, 2));
      expect(fx.stderr.text()).toBe("schema broke\n");
      expect(fx.stdout.text()).toContain("schema out\n");
      expect(fx.stdout.text()).toContain("Krok BUILD_SCHEMA se nezdařil.");
      expect(fx.stdout.text()).not.toContain("Krok BUILD_PANEL");
      expect(fx.logText()).toContain("Krok BUILD_SCHEMA se nezdařil.");
      expect(fx.logText()).not.toContain("schema broke");
      expect(fx.last()).toEqual({
        step: "BUILD_SCHEMA",
        ok: false,
        message: "schema broke schema out",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("treats step stderr as a failure even when the exit code is 0", async () => {
    const fx = createFixture();
    const calls = [];
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => 0,
          spawnSync: (cmd, args) => {
            calls.push(args);
            return { status: 0, stdout: "", stderr: "deprecation\n" };
          },
        })
      );
      expect(code).toBe(1);
      expect(calls).toEqual([STEP_ARGS[0]]);
      expect(fx.stderr.text()).toBe("deprecation\n");
      expect(fx.stdout.text()).toContain("Krok INSTALL se nezdařil.");
      expect(fx.last()).toEqual({
        step: "INSTALL",
        ok: false,
        message: "deprecation",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("stops when spawn returns an error message and no status", async () => {
    const fx = createFixture();
    const calls = [];
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => 0,
          spawnSync: (cmd, args) => {
            calls.push(args);
            return {
              status: null,
              signal: null,
              stdout: "",
              stderr: "",
              error: { message: "spawn ENOENT" },
            };
          },
        })
      );
      expect(code).toBe(1);
      expect(fx.stderr.text()).toBe("spawn ENOENT");
      expect(calls).toEqual([STEP_ARGS[0]]);
      expect(fx.last()).toEqual({
        step: "INSTALL",
        ok: false,
        message: "spawn ENOENT",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("returns 0 when the log parent is a file", async () => {
    const fx = createFixture();
    const parentFile = path.join(fx.root, "not-a-directory");
    fs.writeFileSync(parentFile, "file");
    try {
      const code = await run(
        baseOptions(fx, {
          logPath: path.join(parentFile, "startup.log"),
          bootstrapRun: async () => 0,
          spawnSync: () => {
            return { status: 0, stdout: "", stderr: "" };
          },
        })
      );
      expect(code).toBe(0);
      expect(fx.stderr.text()).toBe("");
    } finally {
      fx.cleanup();
    }
  });

  it("does not install when bootstrap throws", async () => {
    const fx = createFixture();
    const spawnSync = () => {
      throw new Error("pnpm must not run");
    };
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => {
            throw new Error("boom");
          },
          spawnSync,
        })
      );
      expect(code).toBe(1);
      expect(fx.stderr.text()).toBe("");
      expect(fx.stdout.text()).toContain("Krok BOOTSTRAP_BUN se nezdařil.");
      expect(fx.last()).toEqual({
        step: "BOOTSTRAP_BUN",
        ok: false,
        message: "boom",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });

  it("does not install when bootstrap fails", async () => {
    const fx = createFixture();
    const spawnSync = () => {
      throw new Error("pnpm must not run");
    };
    try {
      const code = await run(
        baseOptions(fx, {
          bootstrapRun: async () => 1,
          spawnSync,
        })
      );
      expect(code).toBe(1);
      expect(fx.stderr.text()).toBe("");
      expect(fx.stdout.text()).toContain("Krok BOOTSTRAP_BUN se nezdařil.");
      expect(fx.stdout.text()).not.toContain("Krok INSTALL");
      expect(fx.last()).toEqual({
        step: "BOOTSTRAP_BUN",
        ok: false,
        message: "",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fx.cleanup();
    }
  });
});
