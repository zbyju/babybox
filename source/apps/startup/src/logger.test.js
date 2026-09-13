/* eslint-env jest */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Writable } = require("stream");

const strings = require("./strings");
const {
  LIVE_LOG_NAME,
  MAX_FILE_BYTES,
  MAX_STDIO_CHARS,
  collapseStdio,
  createLogger,
  formatBackupName,
  formatCause,
  formatLogLine,
  formatTimestamp,
  rotateLogFile,
} = require("./logger");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "startup-log-"));
}

function makeStdout() {
  const chunks = [];
  return {
    chunks,
    text: () => chunks.join(""),
    write(chunk) {
      chunks.push(String(chunk));
      return true;
    },
  };
}

function makeDate() {
  return new Date(2026, 8, 13, 15, 16, 0);
}

describe("formatTimestamp", () => {
  it("uses DD.MM.YYYY HH:mm:ss in local time", () => {
    expect(formatTimestamp(makeDate())).toBe("13.09.2026 15:16:00");
  });
});

describe("formatLogLine", () => {
  it("prints timestamp, level, stage, and Czech message", () => {
    expect(
      formatLogLine(makeDate(), "info", "update", strings.updateSucceeded)
    ).toBe(
      "13.09.2026 15:16:00 INFO [update] Aktualizace z gitu byla dokončena."
    );
  });

  it("appends Error.message and stdio without undefined", () => {
    const err = new Error("spawn git ENOENT");
    err.stderr = "fatal: not a git repository\nplease cd first\n";
    expect(
      formatLogLine(makeDate(), "error", "update", strings.updateFailed, err)
    ).toBe(
      "13.09.2026 15:16:00 ERROR [update] Aktualizace z gitu se nezdařila. spawn git ENOENT fatal: not a git repository please cd first"
    );
  });

  it("stringifies a non-Error cause and skips a stack", () => {
    expect(
      formatLogLine(makeDate(), "error", "start", strings.startFailed, 1)
    ).toBe(
      "13.09.2026 15:16:00 ERROR [start] Panel babyboxu se nepodařilo spustit. 1"
    );
  });

  it("omits the cause when it is missing", () => {
    expect(
      formatLogLine(
        makeDate(),
        "error",
        "start",
        strings.startFailed,
        undefined
      )
    ).toBe(
      "13.09.2026 15:16:00 ERROR [start] Panel babyboxu se nepodařilo spustit."
    );
    expect(
      formatLogLine(makeDate(), "error", "start", strings.startFailed, null)
    ).not.toMatch(/undefined/);
  });
});

describe("collapseStdio and formatCause", () => {
  it("turns newlines into spaces and keeps the last 2000 characters", () => {
    const input = `${"a".repeat(100)}\n${"b".repeat(MAX_STDIO_CHARS)}`;
    const collapsed = collapseStdio(input);
    expect(collapsed.includes("\n")).toBe(false);
    expect(collapsed.length).toBe(MAX_STDIO_CHARS);
    expect(collapsed.endsWith("b")).toBe(true);
    expect(collapsed.startsWith("a")).toBe(false);
  });

  it("reads Buffers as utf8", () => {
    expect(collapseStdio(Buffer.from("ahoj\nsvěte"))).toBe("ahoj světe");
  });

  it("uses Error.message and String for other values", () => {
    expect(formatCause(new Error("boom"))).toBe("boom");
    expect(formatCause("configer err - 1")).toBe("configer err - 1");
    expect(formatCause(undefined)).toBe("");
    expect(formatCause(null)).toBe("");
  });
});

describe("rotateLogFile", () => {
  let logsDir;

  beforeEach(() => {
    logsDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(logsDir, { force: true, recursive: true });
  });

  it("renames a large live file to a timestamped backup and keeps 5 newest", () => {
    const livePath = path.join(logsDir, LIVE_LOG_NAME);
    fs.writeFileSync(livePath, "x".repeat(MAX_FILE_BYTES));
    const date = makeDate();
    for (let i = 1; i <= 5; i += 1) {
      const older = new Date(date.getTime() - i * 1000);
      fs.writeFileSync(path.join(logsDir, formatBackupName(older)), "old");
    }

    rotateLogFile(logsDir, date);

    expect(fs.existsSync(livePath)).toBe(false);
    expect(
      fs.existsSync(path.join(logsDir, "startup-20260913-151600.log"))
    ).toBe(true);
    const backups = fs
      .readdirSync(logsDir)
      .filter((name) => name.startsWith("startup-") && name.endsWith(".log"));
    expect(backups).toHaveLength(5);
    expect(backups).toContain("startup-20260913-151600.log");
  });

  it("adds -2 when the backup name already exists", () => {
    const livePath = path.join(logsDir, LIVE_LOG_NAME);
    fs.writeFileSync(livePath, "x".repeat(MAX_FILE_BYTES));
    const date = makeDate();
    fs.writeFileSync(path.join(logsDir, formatBackupName(date)), "taken");

    rotateLogFile(logsDir, date);

    expect(
      fs.existsSync(path.join(logsDir, "startup-20260913-151600-2.log"))
    ).toBe(true);
  });

  it("leaves a small live file in place", () => {
    const livePath = path.join(logsDir, LIVE_LOG_NAME);
    fs.writeFileSync(livePath, "hello");
    rotateLogFile(logsDir, makeDate());
    expect(fs.readFileSync(livePath, "utf8")).toBe("hello");
  });
});

describe("createLogger", () => {
  let logsDir;

  beforeEach(() => {
    logsDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(logsDir, { force: true, recursive: true });
  });

  it("writes the same human line to console and file without Pino", () => {
    const stdout = makeStdout();
    const logger = createLogger({
      logsDir,
      now: () => makeDate(),
      pinoLib: null,
      stdout,
    });

    logger.info("start", strings.startBegin);

    const expected =
      "13.09.2026 15:16:00 INFO [start] Spouštím panel babyboxu.\n";
    expect(stdout.text()).toBe(expected);
    expect(fs.readFileSync(path.join(logsDir, LIVE_LOG_NAME), "utf8")).toBe(
      expected
    );
  });

  it("appends an Error stack on the following lines", () => {
    const stdout = makeStdout();
    const logger = createLogger({
      logsDir,
      now: () => makeDate(),
      pinoLib: null,
      stdout,
    });
    const err = new Error("spawn git ENOENT");
    logger.error("update", strings.updateFailed, err);

    const text = stdout.text();
    expect(text.split("\n")[0]).toContain("Aktualizace z gitu se nezdařila.");
    expect(text.split("\n")[0]).toContain("spawn git ENOENT");
    expect(text).toContain(err.stack);
    expect(fs.readFileSync(path.join(logsDir, LIVE_LOG_NAME), "utf8")).toBe(
      text
    );
  });

  it("warns on the console and continues when the log folder cannot be created", () => {
    const blocked = path.join(logsDir, "blocked");
    fs.writeFileSync(blocked, "not a directory");
    const stdout = makeStdout();
    const logger = createLogger({
      logsDir: blocked,
      now: () => makeDate(),
      pinoLib: null,
      stdout,
    });

    logger.info("start", strings.startBegin);

    expect(stdout.text()).toContain(strings.logFileUnavailable);
    expect(stdout.text()).toContain(strings.startBegin);
    expect(fs.statSync(blocked).isFile()).toBe(true);
  });

  it("writes through Pino to console and file when Pino is available", () => {
    const pinoLib = {
      pino: require("pino"),
      pretty: require("pino-pretty"),
    };
    const chunks = [];
    const stdout = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });

    const logger = createLogger({
      logsDir,
      now: () => makeDate(),
      pinoLib,
      stdout,
    });
    logger.info("build", strings.buildSucceeded);

    const fileText = fs.readFileSync(path.join(logsDir, LIVE_LOG_NAME), "utf8");
    const consoleText = chunks.join("");
    expect(fileText).toContain("Sestavení aplikace bylo dokončeno.");
    expect(fileText).toContain("[build]");
    expect(consoleText).toContain("Sestavení aplikace bylo dokončeno.");
    expect(fileText).not.toMatch(/"level"/);
  });
});
