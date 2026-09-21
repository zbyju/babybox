/* eslint-env jest */
const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");

const {
  buildDownloadUrl,
  isIllegalInstruction,
  isOsHold,
  prependPath,
  readVersions,
  run: runBootstrap,
} = require("./bootstrap");

const REAL_VERSIONS = path.join(__dirname, "versions.env");

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

function fakeResponse(statusCode, headers, body) {
  let sent = false;
  const stream = new Readable({
    read() {
      if (sent) {
        return;
      }
      sent = true;
      this.push(body || Buffer.alloc(0));
      this.push(null);
    },
  });
  stream.statusCode = statusCode;
  stream.headers = headers || {};
  return stream;
}

function sha256(body) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function writeVersions(dir, sha) {
  const file = path.join(dir, "versions.env");
  fs.writeFileSync(
    file,
    [
      "BUN_VERSION=1.4.2",
      `BUN_LINUX_X64_SHA256=${sha}`,
      `BUN_WINDOWS_X64_SHA256=${sha}`,
      "PM2_VERSION=7.0.4",
      "",
    ].join("\n")
  );
  return file;
}

function placeExe(home, name, text) {
  const exe = path.join(home, ".bun", "bin", name);
  fs.mkdirSync(path.dirname(exe), { recursive: true });
  fs.writeFileSync(exe, text);
  return exe;
}

function isBunPath(cmd) {
  return cmd.endsWith(`${path.sep}bun`) || cmd.endsWith(`${path.sep}bun.exe`);
}

function createFixture(overrides) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-home-"));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-root-"));
  const tmpDir = path.join(root, "tmp");
  fs.mkdirSync(tmpDir);
  const logPath = path.join(root, "startup.log");
  const stdout = makeStdout();
  const env = Object.assign({}, process.env);
  const stderrChunks = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk, encoding, cb) => {
    stderrChunks.push(
      Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk)
    );
    if (typeof encoding === "function") {
      encoding();
    } else if (typeof cb === "function") {
      cb();
    }
    return true;
  };
  const calls = [];
  const urls = [];
  const userSpawn = overrides && overrides.spawnSync;
  const userHttps = overrides && overrides.httpsGet;
  const rest = Object.assign({}, overrides);
  delete rest.spawnSync;
  delete rest.httpsGet;
  const spawnSync = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    if (userSpawn) {
      return userSpawn(cmd, args, opts);
    }
    throw new Error(`unexpected spawn ${cmd}`);
  };
  const httpsGet = (url, callback) => {
    urls.push(url);
    if (userHttps) {
      return userHttps(url, callback);
    }
    callback(new Error(`unexpected download ${url}`));
  };

  return {
    home,
    env,
    stdout,
    tmpDir,
    calls,
    urls,
    stderrText: () => stderrChunks.join(""),
    logText: () =>
      fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "",
    run(extra) {
      return runBootstrap(
        Object.assign(
          {
            platform: "linux",
            arch: "x64",
            release: "5.15.0-generic",
            versionsPath: REAL_VERSIONS,
            now: () => new Date(2026, 8, 22, 1, 2, 3),
          },
          rest,
          extra,
          {
            home,
            tmpDir,
            logPath,
            stdout,
            env,
            spawnSync,
            httpsGet,
          }
        )
      );
    },
    cleanup() {
      process.stderr.write = originalWrite;
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

async function withFixture(overrides, fn) {
  const fx = createFixture(overrides);
  try {
    await fn(fx);
    expect(fx.stderrText()).toBe("");
    expect(fx.stdout.text()).toBe(fx.logText());
  } finally {
    fx.cleanup();
  }
}

function matchingSpawn(stdout) {
  return (cmd) => {
    if (isBunPath(cmd)) {
      return {
        status: 0,
        signal: null,
        stdout: stdout || "1.4.2\n",
        stderr: "",
      };
    }
    if (cmd === "pm2") {
      return {
        status: 0,
        signal: null,
        stdout: "7.0.4\n",
        stderr: "pm2 chatter\n",
      };
    }
    throw new Error(`unexpected spawn ${cmd}`);
  };
}

function installSpawn() {
  return (cmd, args, opts) => {
    if (cmd === "unzip" || cmd === "tar") {
      const destFlag = cmd === "unzip" ? "-d" : "-C";
      const dest = args[args.indexOf(destFlag) + 1];
      const folderName = cmd === "tar" ? "bun-windows-x64" : "bun-linux-x64";
      const exeName = cmd === "tar" ? "bun.exe" : "bun";
      const folder = path.join(dest, folderName);
      fs.mkdirSync(folder, { recursive: true });
      const exe = path.join(folder, exeName);
      fs.writeFileSync(exe, "#!/bin/sh\necho 1.4.2\n");
      fs.chmodSync(exe, 0o755);
      return { status: 0, signal: null, stdout: "", stderr: "unzip chatter\n" };
    }
    if (cmd === "pm2") {
      return {
        status: 0,
        signal: null,
        stdout: "7.0.4\n",
        stderr: "pm2 chatter\n",
      };
    }
    if (cmd.endsWith(`${path.sep}bun.exe`)) {
      return { status: 0, signal: null, stdout: "1.4.2\n", stderr: "" };
    }
    if (isBunPath(cmd)) {
      const text = fs.readFileSync(cmd, "utf8");
      if (text === "old") {
        return { status: null, signal: "SIGILL", stdout: "", stderr: "" };
      }
      return childProcess.spawnSync(cmd, args, opts);
    }
    throw new Error(`unexpected spawn ${cmd}`);
  };
}

describe("versions.env", () => {
  it("reads the pinned Bun, pm2, and zip checksums", () => {
    const versions = readVersions(fs.readFileSync(REAL_VERSIONS, "utf8"));
    expect(versions.BUN_VERSION).toBe("1.4.2");
    expect(versions.PM2_VERSION).toBe("7.0.4");
    expect(versions.BUN_LINUX_X64_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(versions.BUN_WINDOWS_X64_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores comments, blanks, and CRLF", () => {
    expect(readVersions("# note\r\n\r\nBUN_VERSION=1.4.2\r\n")).toEqual({
      BUN_VERSION: "1.4.2",
    });
  });
});

describe("OS hold", () => {
  it.each([
    ["win32", "6.1.7601", true],
    ["win32", "6.2.9200", true],
    ["win32", "6.3.9600", true],
    ["win32", "10.0.17762", true],
    ["win32", "10.0.17763", false],
    ["win32", "10.0.22000", false],
    ["linux", "6.2.9200", false],
    ["linux", "5.15.0-generic", false],
  ])("%s %s hold=%s", (platform, release, held) => {
    expect(isOsHold(platform, release)).toBe(held);
  });

  it("exits non-zero before any download and does not change the profile", async () => {
    await withFixture(
      { platform: "win32", release: "6.2.9200" },
      async (fx) => {
        expect(await fx.run()).toBe(1);
        expect(fx.urls).toEqual([]);
        expect(fx.calls).toEqual([]);
        expect(fs.readdirSync(fx.home)).toEqual([]);
        expect(fx.stdout.text()).toContain("Krok OS_HOLD.");
        expect(fx.stdout.text()).toContain("Vydání 6.2.9200.");
        expect(fx.stdout.text()).not.toContain("Windows 8");
      }
    );
  });
});

describe("CPU hold", () => {
  it.each([
    [{ signal: "SIGILL", status: null }, true],
    [{ signal: null, status: 3221225501 }, true],
    [{ signal: null, status: -1073741795 }, true],
    [{ signal: "SIGSEGV", status: null }, false],
    [{ signal: null, status: 1 }, false],
    [{ signal: null, status: 0 }, false],
  ])("illegal instruction %j -> %s", (result, illegal) => {
    expect(isIllegalInstruction(result)).toBe(illegal);
  });

  it("records CPU_HOLD and does not download again for the same pin", async () => {
    await withFixture(
      {
        spawnSync(cmd) {
          if (isBunPath(cmd)) {
            return { status: null, signal: "SIGILL", stdout: "", stderr: "" };
          }
          if (cmd === "pm2") {
            return { status: 0, signal: null, stdout: "7.0.4\n", stderr: "" };
          }
          throw new Error(`unexpected spawn ${cmd}`);
        },
      },
      async (fx) => {
        placeExe(fx.home, "bun", "old");
        expect(await fx.run()).toBe(1);
        expect(await fx.run()).toBe(1);
        expect(fx.urls).toEqual([]);
        expect(
          fs.readFileSync(path.join(fx.home, ".bun", "cpu-hold"), "utf8")
        ).toBe("1.4.2\n");
        expect(fx.stdout.text()).toContain("Krok CPU_HOLD.");
        expect(fx.calls.map((call) => call.cmd)).not.toContain("unzip");
        expect(fx.calls.map((call) => call.cmd)).not.toContain("git");
      }
    );
  });
});

describe("download", () => {
  it("builds the pinned linux zip url and not the alias asset", () => {
    expect(buildDownloadUrl("1.4.2", "bun-linux-x64")).toBe(
      "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-linux-x64.zip"
    );
    expect(buildDownloadUrl("1.4.2", "bun-windows-x64")).toBe(
      "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-windows-x64.zip"
    );
    expect(
      buildDownloadUrl("1.4.2", "bun-linux-x64").includes("baseline")
    ).toBe(false);
  });

  it("installs a matching zip, then skips the download", async () => {
    const body = Buffer.from("pinned-zip");
    const sha = sha256(body);
    await withFixture(
      {
        spawnSync: installSpawn(),
        httpsGet(_url, callback) {
          callback(null, fakeResponse(200, {}, body));
        },
      },
      async (fx) => {
        const versionsPath = writeVersions(fx.tmpDir, sha);
        expect(await fx.run({ versionsPath })).toBe(0);
        expect(fx.urls).toEqual([
          "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-linux-x64.zip",
        ]);
        const unzip = fx.calls.find((call) => call.cmd === "unzip");
        expect(unzip.args.slice(0, 3)).toEqual(["-o", "-q", "-d"]);
        expect(unzip.opts.stdio).toEqual(["ignore", "pipe", "pipe"]);
        expect(unzip.opts.shell).toBe(false);
        const exe = path.join(fx.home, ".bun", "bin", "bun");
        expect(fs.readFileSync(exe, "utf8")).toContain("echo 1.4.2");
        expect(fx.env.PATH.split(path.delimiter)[0]).toBe(
          path.join(fx.home, ".bun", "bin")
        );
        expect(fx.stdout.text()).toContain("Stahuji Bun 1.4.2.");
        expect(fx.stdout.text()).toContain("Bun 1.4.2 je nainstalovaný.");
        expect(fx.stdout.text()).toContain("pm2 7.0.4 se shoduje.");
        expect(fx.stdout.text()).not.toContain("unzip chatter");
        expect(fx.stdout.text()).not.toContain("pm2 chatter");
        expect(fs.readdirSync(fx.tmpDir)).toEqual(["versions.env"]);
        expect(await fx.run({ versionsPath })).toBe(0);
        expect(fx.urls).toHaveLength(1);
      }
    );
  });

  it("follows an https redirect and rejects an http redirect", async () => {
    const body = Buffer.from("redirected-zip");
    const sha = sha256(body);
    await withFixture(
      {
        spawnSync: installSpawn(),
        httpsGet(url, callback) {
          if (url.startsWith("https://github.com/")) {
            callback(
              null,
              fakeResponse(
                302,
                { location: "https://downloads.example/bun-linux-x64.zip" },
                Buffer.from("go")
              )
            );
            return;
          }
          callback(null, fakeResponse(200, {}, body));
        },
      },
      async (fx) => {
        const versionsPath = writeVersions(fx.tmpDir, sha);
        expect(await fx.run({ versionsPath })).toBe(0);
        expect(fx.urls[1]).toBe("https://downloads.example/bun-linux-x64.zip");
      }
    );

    await withFixture(
      {
        httpsGet(_url, callback) {
          callback(
            null,
            fakeResponse(302, { location: "http://example.com/bun.zip" }, null)
          );
        },
      },
      async (fx) => {
        const versionsPath = writeVersions(fx.tmpDir, sha);
        expect(await fx.run({ versionsPath })).toBe(1);
        expect(fx.stdout.text()).toContain("Stažení Bun se nezdařilo.");
        expect(fx.stdout.text()).toContain("Přesměrování není https.");
        expect(fx.calls.map((call) => call.cmd)).not.toContain("unzip");
        expect(fs.readdirSync(fx.home)).toEqual([]);
      }
    );
  });

  it("rejects a checksum mismatch before extract", async () => {
    await withFixture(
      {
        spawnSync: installSpawn(),
        httpsGet(_url, callback) {
          callback(null, fakeResponse(200, {}, Buffer.from("tampered")));
        },
      },
      async (fx) => {
        const versionsPath = writeVersions(fx.tmpDir, sha256("expected"));
        expect(await fx.run({ versionsPath })).toBe(1);
        expect(fx.stdout.text()).toContain(
          "Kontrolní součet archivu Bun se neshoduje."
        );
        expect(fx.calls.map((call) => call.cmd)).not.toContain("unzip");
        expect(fs.existsSync(path.join(fx.home, ".bun", "bin", "bun"))).toBe(
          false
        );
      }
    );
  });

  it("downloads again only after the recorded pin changes", async () => {
    const body = Buffer.from("newer-zip");
    const sha = sha256(body);
    await withFixture(
      {
        spawnSync: installSpawn(),
        httpsGet(_url, callback) {
          callback(null, fakeResponse(200, {}, body));
        },
      },
      async (fx) => {
        placeExe(fx.home, "bun", "old");
        fs.writeFileSync(path.join(fx.home, ".bun", "cpu-hold"), "1.4.0\n");
        const versionsPath = writeVersions(fx.tmpDir, sha);
        expect(await fx.run({ versionsPath })).toBe(0);
        expect(fx.urls).toHaveLength(1);
        expect(fs.existsSync(path.join(fx.home, ".bun", "cpu-hold"))).toBe(
          false
        );
        expect(
          fs.readFileSync(path.join(fx.home, ".bun", "bin", "bun"), "utf8")
        ).toContain("echo 1.4.2");
      }
    );
  });
});

describe("already installed", () => {
  it("exits 0 when Bun matches and prepends PATH for child processes", async () => {
    await withFixture({ spawnSync: matchingSpawn() }, async (fx) => {
      placeExe(fx.home, "bun", "present");
      expect(await fx.run()).toBe(0);
      expect(fx.urls).toEqual([]);
      expect(fx.env.PATH.split(path.delimiter)[0]).toBe(
        path.join(fx.home, ".bun", "bin")
      );
      expect(fx.stdout.text()).toBe(
        "22.09.2026 01:02:03 INFO [bootstrap] Bun 1.4.2 už je nainstalovaný.\n" +
          "22.09.2026 01:02:03 INFO [bootstrap] pm2 7.0.4 se shoduje.\n"
      );
      const bun = fx.calls.find((call) => isBunPath(call.cmd));
      expect(bun.opts.stdio).toEqual(["ignore", "pipe", "pipe"]);
      expect(fx.stdout.text()).not.toContain("pm2 chatter");
    });
  });

  it("still exits 0 when pm2 does not match", async () => {
    await withFixture(
      {
        spawnSync(cmd) {
          if (isBunPath(cmd)) {
            return { status: 0, signal: null, stdout: "1.4.2\n", stderr: "" };
          }
          if (cmd === "pm2") {
            return { status: 0, signal: null, stdout: "5.1.0\n", stderr: "" };
          }
          throw new Error(`unexpected spawn ${cmd}`);
        },
      },
      async (fx) => {
        placeExe(fx.home, "bun", "present");
        expect(await fx.run()).toBe(0);
        expect(fx.stdout.text()).toContain("pm2 je 5.1.0, chceme 7.0.4.");
      }
    );
  });

  it("still exits 0 when pm2 is missing", async () => {
    await withFixture(
      {
        spawnSync(cmd) {
          if (isBunPath(cmd)) {
            return { status: 0, signal: null, stdout: "1.4.2\n", stderr: "" };
          }
          if (cmd === "pm2") {
            const error = new Error("spawn pm2 ENOENT");
            error.code = "ENOENT";
            return {
              error,
              status: null,
              signal: null,
              stdout: "",
              stderr: "",
            };
          }
          throw new Error(`unexpected spawn ${cmd}`);
        },
      },
      async (fx) => {
        placeExe(fx.home, "bun", "present");
        expect(await fx.run()).toBe(0);
        expect(fx.stdout.text()).toContain("pm2 chybí, chceme 7.0.4.");
      }
    );
  });

  it("does not treat a linux release string as a Windows hold", async () => {
    await withFixture(
      { release: "6.2.9200", spawnSync: matchingSpawn() },
      async (fx) => {
        placeExe(fx.home, "bun", "present");
        expect(await fx.run()).toBe(0);
        expect(fx.stdout.text()).not.toContain("OS_HOLD");
      }
    );
  });
});

describe("platform", () => {
  it("exits non-zero for an OS without a pinned zip", async () => {
    await withFixture({ platform: "darwin" }, async (fx) => {
      expect(await fx.run()).toBe(1);
      expect(fx.urls).toEqual([]);
      expect(fx.stdout.text()).toContain("Systém darwin.");
    });
  });

  it("exits non-zero for a non-x64 cpu without downloading", async () => {
    await withFixture({ arch: "arm64" }, async (fx) => {
      expect(await fx.run()).toBe(1);
      expect(fx.urls).toEqual([]);
      expect(fx.stdout.text()).toContain("Architektura arm64.");
      expect(fx.stdout.text()).not.toContain("CPU_HOLD");
    });
  });

  it("extracts the windows zip with tar into the user profile", async () => {
    const body = Buffer.from("windows-zip");
    const sha = sha256(body);
    await withFixture(
      {
        platform: "win32",
        release: "10.0.19045",
        spawnSync: installSpawn(),
        httpsGet(_url, callback) {
          callback(null, fakeResponse(200, {}, body));
        },
      },
      async (fx) => {
        const versionsPath = writeVersions(fx.tmpDir, sha);
        expect(await fx.run({ versionsPath })).toBe(0);
        expect(fx.urls[0]).toBe(
          "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-windows-x64.zip"
        );
        const tar = fx.calls.find((call) => call.cmd === "tar");
        expect(tar.args[0]).toBe("-xf");
        expect(tar.args[2]).toBe("-C");
        expect(tar.opts.shell).toBe(false);
        const pm2 = fx.calls.find((call) => call.cmd === "pm2");
        expect(pm2.opts.shell).toBe(true);
        expect(
          fs.readFileSync(path.join(fx.home, ".bun", "bin", "bun.exe"), "utf8")
        ).toContain("echo 1.4.2");
      }
    );
  });

  it("keeps Windows 10 build 17763 on the install path", async () => {
    await withFixture(
      {
        platform: "win32",
        release: "10.0.17763",
        spawnSync: matchingSpawn(),
      },
      async (fx) => {
        placeExe(fx.home, "bun.exe", "present");
        expect(await fx.run()).toBe(0);
        expect(fx.urls).toEqual([]);
        expect(fx.stdout.text()).not.toContain("OS_HOLD");
      }
    );
  });
});

describe("syntax", () => {
  it("stays on Node 12 CommonJS and does not name a git branch or dist swap", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "bootstrap.js"),
      "utf8"
    );
    expect(source.includes("??")).toBe(false);
    expect(source.includes("?.")).toBe(false);
    expect(source.includes("fs/promises")).toBe(false);
    expect(source.includes("replaceAll(")).toBe(false);
    expect(source.includes("Object.hasOwn")).toBe(false);
    expect(source.includes("bun-linux-x64-baseline")).toBe(false);
    expect(source.includes("bun-windows-x64-baseline")).toBe(false);
    expect(source.includes("Windows 8")).toBe(false);
    expect(source.includes("git checkout")).toBe(false);
    expect(source.includes("dist2")).toBe(false);
    expect(/\bimport\s/.test(source)).toBe(false);
    expect(/\bexport\s/.test(source)).toBe(false);
  });
});

describe("prependPath", () => {
  it("puts the Bun bin first and does not duplicate it", () => {
    const env = {
      PATH: ["/usr/bin", "/home/me/.bun/bin"].join(path.delimiter),
    };
    prependPath(env, "/home/me/.bun/bin");
    const parts = env.PATH.split(path.delimiter);
    expect(parts[0]).toBe("/home/me/.bun/bin");
    expect(parts.filter((part) => part === "/home/me/.bun/bin")).toHaveLength(
      1
    );
  });
});
