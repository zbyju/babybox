/* eslint-env jest */
const fs = require("fs");
const os = require("os");
const path = require("path");

const { readVersions } = require("./bootstrap");
const { start } = require("./start-app");

const REAL_VERSIONS = path.join(__dirname, "versions.env");
const PIN = readVersions(fs.readFileSync(REAL_VERSIONS, "utf8")).BUN_VERSION;
const ROOT_PACKAGE = path.join(__dirname, "../../package.json");
const CONFIGER_PACKAGE = path.join(__dirname, "../configer/package.json");
const BASE_PATH = ["/usr/bin", "/bin"].join(path.delimiter);

const posixIt = process.platform === "win32" ? it.skip : it;

function makeStdout() {
  const chunks = [];
  return {
    text: () => chunks.join(""),
    write(chunk) {
      chunks.push(String(chunk));
      return true;
    },
  };
}

function createFixture(prefix) {
  const home = fs.mkdtempSync(
    path.join(os.tmpdir(), prefix || "babybox-home-")
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-start-"));
  const sourceDir = path.join(root, "source");
  const distDir = path.join(root, "dist");
  fs.mkdirSync(path.join(sourceDir, "apps", "configer"), { recursive: true });
  fs.mkdirSync(distDir);
  return {
    home,
    root,
    sourceDir,
    distDir,
    configerDir: path.join(sourceDir, "apps", "configer"),
    binDir: path.join(home, ".bun", "bin"),
    stdout: makeStdout(),
    calls: [],
    cleanup() {
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function placeBun(fx, name) {
  const exe = path.join(fx.binDir, name || "bun");
  fs.mkdirSync(fx.binDir, { recursive: true });
  fs.writeFileSync(exe, "bun");
  return exe;
}

function placeDistModules(fx) {
  fs.mkdirSync(path.join(fx.distDir, "node_modules"));
}

function writeCpuHold(fx, version) {
  fs.mkdirSync(path.join(fx.home, ".bun"), { recursive: true });
  fs.writeFileSync(path.join(fx.home, ".bun", "cpu-hold"), `${version}\n`);
}

function isBun(cmd) {
  return cmd.endsWith(`${path.sep}bun`) || cmd.endsWith(`${path.sep}bun.exe`);
}

// Bun answers -v with this version. Every other call exits 0.
function bunAnswers(version) {
  return (cmd, args) => {
    if (isBun(cmd) && args[0] === "-v") {
      return { status: 0, signal: null, stdout: `${version}\n`, stderr: "" };
    }
    return { status: 0, signal: null };
  };
}

function bunMustNotRun() {
  return (cmd) => {
    if (isBun(cmd)) {
      throw new Error(`bun must not run: ${cmd}`);
    }
    return { status: 0, signal: null };
  };
}

function runStart(fx, name, reply, extra) {
  const spawnSync = (cmd, args, opts) => {
    fx.calls.push({ cmd, args, opts });
    return reply(cmd, args, opts);
  };
  return start(
    name,
    Object.assign(
      {
        platform: "linux",
        release: "5.15.0-generic",
        home: fx.home,
        sourceDir: fx.sourceDir,
        versionsPath: REAL_VERSIONS,
        env: { PATH: BASE_PATH },
        stdout: fx.stdout,
        spawnSync,
      },
      extra
    )
  );
}

function withFixture(fn, prefix) {
  const fx = createFixture(prefix);
  try {
    fn(fx);
  } finally {
    fx.cleanup();
  }
}

function pm2Calls(fx) {
  return fx.calls.filter((call) => !isBun(call.cmd));
}

describe("start on Bun", () => {
  it("starts configer with the absolute Bun path", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      expect(runStart(fx, "configer", bunAnswers(PIN))).toBe(0);
      expect(fx.calls.map((call) => [call.cmd, call.args])).toEqual([
        [exe, ["-v"]],
        [
          "pm2",
          ["start", "./dist/index.js", "-n", "configer", "--interpreter", exe],
        ],
      ]);
      const pm2 = fx.calls[1].opts;
      expect(pm2.shell).toBe(false);
      expect(pm2.cwd).toBe(fx.configerDir);
      expect(pm2.env.PATH.split(path.delimiter)[0]).toBe(fx.binDir);
      expect(fx.stdout.text()).toBe(
        `Spouštím configer na Bun ${PIN} (${exe}).\n`
      );
    });
  });

  it("starts the backend from the repo dist", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      placeDistModules(fx);
      expect(runStart(fx, "main", bunAnswers(PIN))).toBe(0);
      expect(fx.calls.map((call) => [call.cmd, call.args])).toEqual([
        [exe, ["-v"]],
        [
          "pm2",
          ["start", "../dist/index.js", "-n", "babybox", "--interpreter", exe],
        ],
      ]);
      expect(fx.calls[1].opts.cwd).toBe(fx.distDir);
    });
  });

  it("runs bun install --no-save before pm2 when dist has no node_modules", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      expect(runStart(fx, "main", bunAnswers(PIN))).toBe(0);
      expect(fx.calls.map((call) => [call.cmd, call.args[0]])).toEqual([
        [exe, "-v"],
        [exe, "install"],
        ["pm2", "start"],
      ]);
      const install = fx.calls[1];
      expect(install.args).toEqual(["install", "--no-save"]);
      expect(install.opts.cwd).toBe(fx.distDir);
      expect(install.opts.shell).toBe(false);
      expect(install.opts.env.PATH.split(path.delimiter)[0]).toBe(fx.binDir);
    });
  });

  it("returns the install exit code and does not call pm2", () => {
    withFixture((fx) => {
      placeBun(fx);
      const reply = (cmd, args) => {
        if (args[0] === "install") {
          return { status: 7, signal: null };
        }
        return bunAnswers(PIN)(cmd, args);
      };
      expect(runStart(fx, "main", reply)).toBe(7);
      expect(pm2Calls(fx)).toEqual([]);
    });
  });

  it("uses a Bun that answers with another version", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      expect(runStart(fx, "configer", bunAnswers("1.3.0"))).toBe(0);
      expect(pm2Calls(fx)[0].args).toContain(exe);
      expect(fx.stdout.text()).toBe(
        `Spouštím configer na Bun 1.3.0 (${exe}). Chceme ${PIN}.\n`
      );
    });
  });

  it("probes Bun when cpu-hold names an older pin", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      writeCpuHold(fx, "1.3.0");
      expect(runStart(fx, "configer", bunAnswers(PIN))).toBe(0);
      expect(fx.calls[0].cmd).toBe(exe);
      expect(pm2Calls(fx)[0].args).toContain("--interpreter");
    });
  });
});

describe("start on Node", () => {
  it.each(["6.1.7601", "6.2.9200", "10.0.17134"])(
    "does not run Bun on the hold OS %s",
    (release) => {
      withFixture((fx) => {
        placeBun(fx, "bun.exe");
        expect(
          runStart(fx, "configer", bunMustNotRun(), {
            platform: "win32",
            release,
          })
        ).toBe(0);
        expect(fx.calls).toHaveLength(1);
        expect(fx.calls[0].cmd).toBe(
          "pm2 \"start\" \"./dist/index.js\" \"-n\" \"configer\""
        );
        expect(fx.calls[0].args).toEqual([]);
        expect(fx.calls[0].opts.shell).toBe(true);
        expect(fx.stdout.text()).toBe(
          "Spouštím configer na Node, systém je v OS_HOLD.\n"
        );
      });
    }
  );

  it("does not probe Bun when cpu-hold names the pin", () => {
    withFixture((fx) => {
      placeBun(fx);
      writeCpuHold(fx, PIN);
      expect(runStart(fx, "configer", bunMustNotRun())).toBe(0);
      expect(fx.calls.map((call) => call.args)).toEqual([
        ["start", "./dist/index.js", "-n", "configer"],
      ]);
      expect(fx.stdout.text()).toBe(
        "Spouštím configer na Node, procesor je v CPU_HOLD.\n"
      );
    });
  });

  it("starts on Node when the Bun binary is missing", () => {
    withFixture((fx) => {
      expect(runStart(fx, "configer", bunMustNotRun())).toBe(0);
      expect(fx.calls.map((call) => call.args)).toEqual([
        ["start", "./dist/index.js", "-n", "configer"],
      ]);
      expect(fx.stdout.text()).toBe("Spouštím configer na Node, Bun chybí.\n");
    });
  });

  it.each([
    ["an illegal instruction", { status: null, signal: "SIGILL" }],
    ["the Windows illegal instruction code", { status: 3221225501 }],
    ["a spawn error", { status: null, error: { code: "ENOENT" } }],
    [
      "a timeout",
      { status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT" } },
    ],
    ["an empty version", { status: 0, stdout: "\n" }],
  ])("starts on Node after %s from bun -v", (label, answer) => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      const reply = (cmd) => {
        if (isBun(cmd)) {
          return answer;
        }
        return { status: 0, signal: null };
      };
      expect(runStart(fx, "configer", reply)).toBe(0);
      expect(fx.calls[0].cmd).toBe(exe);
      expect(fx.calls[0].opts.timeout).toBe(30000);
      expect(pm2Calls(fx).map((call) => call.args)).toEqual([
        ["start", "./dist/index.js", "-n", "configer"],
      ]);
      expect(fx.stdout.text()).toBe(
        "Spouštím configer na Node, Bun nejde spustit.\n"
      );
    });
  });

  it("starts on Node when the bun -v spawn throws", () => {
    withFixture((fx) => {
      placeBun(fx);
      const reply = (cmd) => {
        if (isBun(cmd)) {
          throw new Error("spawn failed");
        }
        return { status: 0, signal: null };
      };
      expect(runStart(fx, "configer", reply)).toBe(0);
      expect(pm2Calls(fx)[0].args).not.toContain("--interpreter");
    });
  });

  it("returns 1 when dist has no node_modules and Bun cannot run", () => {
    withFixture((fx) => {
      expect(runStart(fx, "main", bunMustNotRun())).toBe(1);
      expect(fx.calls).toEqual([]);
      expect(fx.stdout.text()).toBe(
        "Spouštím babybox na Node, Bun chybí.\n" +
          "Balíčky v dist chybí a Bun nejde spustit.\n"
      );
    });
  });
});

describe("pm2 command", () => {
  it("runs one quoted cmd.exe line on Windows", () => {
    withFixture((fx) => {
      const exe = placeBun(fx, "bun.exe");
      expect(exe).toContain(" ");
      expect(
        runStart(fx, "configer", bunAnswers(PIN), {
          platform: "win32",
          release: "10.0.19045",
        })
      ).toBe(0);
      const pm2 = fx.calls[1];
      expect(pm2.cmd).toBe(
        `pm2 "start" "./dist/index.js" "-n" "configer" "--interpreter" "${exe}"`
      );
      expect(pm2.args).toEqual([]);
      expect(pm2.opts.shell).toBe(true);
      expect(pm2.opts.windowsHide).toBe(true);
      expect(fx.calls[0].opts.shell).toBe(false);
    }, "babybox home ");
  });

  it("returns the pm2 exit code", () => {
    withFixture((fx) => {
      placeBun(fx);
      const reply = (cmd, args) => {
        if (cmd === "pm2") {
          return { status: 1, signal: null };
        }
        return bunAnswers(PIN)(cmd, args);
      };
      expect(runStart(fx, "configer", reply)).toBe(1);
    });
  });

  it("returns 1 and names the error when pm2 cannot spawn", () => {
    withFixture((fx) => {
      const reply = () => {
        return {
          status: null,
          signal: null,
          error: new Error("spawn pm2 ENOENT"),
        };
      };
      expect(runStart(fx, "configer", reply)).toBe(1);
      expect(fx.stdout.text()).toContain(
        "pm2 nejde spustit. spawn pm2 ENOENT\n"
      );
    });
  });

  it("returns 1 for an unknown app and spawns nothing", () => {
    withFixture((fx) => {
      expect(runStart(fx, "panel", bunAnswers(PIN))).toBe(1);
      expect(fx.calls).toEqual([]);
      expect(fx.stdout.text()).toBe("Neznámá aplikace panel.\n");
    });
  });

  it("returns 1 when the app directory is missing", () => {
    withFixture((fx) => {
      fs.rmSync(fx.distDir, { recursive: true, force: true });
      expect(runStart(fx, "main", bunAnswers(PIN))).toBe(1);
      expect(fx.calls).toEqual([]);
      expect(fx.stdout.text()).toBe(`Adresář ${fx.distDir} chybí.\n`);
    });
  });
});

describe("real processes", () => {
  posixIt("gives pm2 the Bun path when PATH has no bun", () => {
    withFixture((fx) => {
      const exe = placeBun(fx);
      const fakeBin = path.join(fx.root, "bin");
      const callLog = path.join(fx.root, "calls.txt");
      fs.mkdirSync(fakeBin);
      fs.writeFileSync(
        exe,
        [
          "#!/bin/sh",
          "printf \"bun %s\\n\" \"$*\" >>\"$CALL_LOG\"",
          `if [ "$1" = "-v" ]; then echo ${PIN}; fi`,
          "",
        ].join("\n")
      );
      fs.writeFileSync(
        path.join(fakeBin, "pm2"),
        [
          "#!/bin/sh",
          "printf \"pm2 %s\\n\" \"$*\" >>\"$CALL_LOG\"",
          "printf \"path %s\\n\" \"${PATH%%:*}\" >>\"$CALL_LOG\"",
          "",
        ].join("\n")
      );
      fs.chmodSync(exe, 0o755);
      fs.chmodSync(path.join(fakeBin, "pm2"), 0o755);
      const code = start("main", {
        home: fx.home,
        sourceDir: fx.sourceDir,
        stdout: fx.stdout,
        env: {
          PATH: [fakeBin, "/usr/bin", "/bin"].join(path.delimiter),
          CALL_LOG: callLog,
        },
      });
      expect(code).toBe(0);
      expect(fs.readFileSync(callLog, "utf8").split("\n")).toEqual([
        "bun -v",
        "bun install --no-save",
        `pm2 start ../dist/index.js -n babybox --interpreter ${exe}`,
        `path ${fx.binDir}`,
        "",
      ]);
    });
  });
});

describe("start scripts", () => {
  it("call the helper from the root and from configer", () => {
    const root = JSON.parse(fs.readFileSync(ROOT_PACKAGE, "utf8"));
    const configer = JSON.parse(fs.readFileSync(CONFIGER_PACKAGE, "utf8"));
    expect(root.scripts["start:configer"]).toBe(
      "node apps/startup/start-app.js configer"
    );
    expect(root.scripts["start:main"]).toBe(
      "node apps/startup/start-app.js main"
    );
    expect(configer.scripts.start).toBe(
      "node ../startup/start-app.js configer"
    );
  });
});
