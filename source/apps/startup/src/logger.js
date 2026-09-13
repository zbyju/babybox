const fs = require("fs");
const path = require("path");

const strings = require("./strings");

const LIVE_LOG_NAME = "startup.log";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BACKUP_FILES = 5;
const MAX_STDIO_CHARS = 2000;
const BACKUP_NAME_RE = /^startup-\d{8}-\d{6}(?:-\d+)?\.log$/;
const LEVEL = {
  error: "ERROR",
  info: "INFO",
  warn: "WARN",
};

function defaultLogsDir() {
  return path.resolve(__dirname, "../../../logs");
}

function loadPino() {
  try {
    return {
      pino: require("pino"),
      pretty: require("pino-pretty"),
    };
  } catch {
    return null;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTimestamp(date) {
  return (
    `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

function formatBackupName(date, suffix) {
  const stamp =
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-` +
    `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  if (suffix === undefined) {
    return `startup-${stamp}.log`;
  }
  return `startup-${stamp}-${suffix}.log`;
}

function stdioToString(value) {
  if (value === undefined || value === null) {
    return "";
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  return String(value);
}

function collapseStdio(value) {
  const collapsed = stdioToString(value)
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ +/g, " ")
    .trim();
  if (collapsed.length <= MAX_STDIO_CHARS) {
    return collapsed;
  }
  return collapsed.slice(-MAX_STDIO_CHARS);
}

function formatCause(err) {
  if (err === undefined || err === null) {
    return "";
  }
  if (err instanceof Error) {
    if (err.message) {
      return collapseStdio(err.message);
    }
    return collapseStdio(String(err));
  }
  return collapseStdio(String(err));
}

function collectStdio(err) {
  if (err === undefined || err === null || typeof err !== "object") {
    return "";
  }
  return collapseStdio(
    [stdioToString(err.stderr), stdioToString(err.stdout)]
      .filter(Boolean)
      .join(" ")
  );
}

function formatDetails(err, message) {
  const cause = formatCause(err);
  const stdio = collectStdio(err);
  const parts = [];
  if (cause && cause !== message) {
    parts.push(cause);
  }
  if (
    stdio &&
    stdio !== cause &&
    stdio !== message &&
    cause.includes(stdio) === false &&
    message.includes(stdio) === false
  ) {
    parts.push(stdio);
  }
  return parts.join(" ");
}

function formatLogLine(date, level, stage, message, err) {
  const label = LEVEL[level] || String(level).toUpperCase();
  const stageTag = stage ? `[${stage}]` : "";
  const text = message === undefined || message === null ? "" : String(message);
  const details = formatDetails(err, text);
  const body = details ? `${text} ${details}` : text;
  return `${formatTimestamp(date)} ${label} ${stageTag} ${body}`.replace(
    / +/g,
    " "
  );
}

function errorStack(err) {
  if (err instanceof Error && err.stack) {
    return err.stack;
  }
  return "";
}

function backupSortKey(name) {
  const match = name.match(/^startup-(\d{8})-(\d{6})(?:-(\d+))?\.log$/);
  if (!match) {
    return "";
  }
  const extra = match[3] ? String(match[3]).padStart(4, "0") : "0000";
  return `${match[1]}${match[2]}${extra}`;
}

function listBackupFiles(logsDir) {
  try {
    return fs
      .readdirSync(logsDir)
      .filter((name) => BACKUP_NAME_RE.test(name))
      .map((name) => ({ name, filePath: path.join(logsDir, name) }))
      .sort((a, b) => backupSortKey(b.name).localeCompare(backupSortKey(a.name)));
  } catch (err) {
    return [];
  }
}

function pruneBackups(logsDir) {
  const extras = listBackupFiles(logsDir).slice(MAX_BACKUP_FILES);
  extras.forEach((entry) => {
    try {
      fs.unlinkSync(entry.filePath);
    } catch (err) {
      // Keep going. A leftover backup must not stop startup.
    }
  });
}

function rotateLogFile(logsDir, date) {
  const livePath = path.join(logsDir, LIVE_LOG_NAME);
  let stat;
  try {
    stat = fs.statSync(livePath);
  } catch (err) {
    return;
  }
  if (stat.size < MAX_FILE_BYTES) {
    return;
  }
  let suffix;
  let targetName = formatBackupName(date);
  while (fs.existsSync(path.join(logsDir, targetName))) {
    suffix = suffix === undefined ? 2 : suffix + 1;
    targetName = formatBackupName(date, suffix);
  }
  fs.renameSync(livePath, path.join(logsDir, targetName));
  pruneBackups(logsDir);
}

function createPretty(pretty, destination) {
  return pretty({
    colorize: false,
    destination,
    hideObject: true,
    ignore: "pid,hostname,time,level",
    messageFormat: (log, messageKey) => log[messageKey],
    sync: true,
    translateTime: false,
  });
}

function createLogger(options = {}) {
  const logsDir = options.logsDir || defaultLogsDir();
  const stdout = options.stdout || process.stdout;
  const now = options.now || (() => new Date());
  const pinoLib =
    options.pinoLib === undefined ? loadPino() : options.pinoLib;
  const livePath = path.join(logsDir, LIVE_LOG_NAME);

  let fileEnabled = false;
  let fileDest = null;
  let pinoLogger = null;
  let warnedFileUnavailable = false;

  function writeStdout(text) {
    try {
      stdout.write(`${text}\n`);
    } catch (err) {
      // Ignore a broken console. Startup must continue.
    }
  }

  function writeFile(text) {
    if (!fileEnabled) {
      return;
    }
    try {
      if (fileDest && typeof fileDest.write === "function") {
        fileDest.write(`${text}\n`);
        return;
      }
      fs.appendFileSync(livePath, `${text}\n`, "utf8");
    } catch (err) {
      fileEnabled = false;
      fileDest = null;
      pinoLogger = null;
      if (!warnedFileUnavailable) {
        warnedFileUnavailable = true;
        writeStdout(
          formatLogLine(
            now(),
            "warn",
            "start",
            strings.logFileUnavailable,
            err
          )
        );
      }
    }
  }

  function emit(level, stage, message, err) {
    try {
      const line = formatLogLine(now(), level, stage, message, err);
      const stack = errorStack(err);
      if (pinoLogger) {
        pinoLogger[level](line);
      } else {
        writeStdout(line);
        writeFile(line);
      }
      if (stack) {
        writeStdout(stack);
        writeFile(stack);
      }
    } catch (writeErr) {
      try {
        stdout.write(`${String(message)}\n`);
      } catch (consoleErr) {}
    }
  }

  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    fileEnabled = false;
    fileDest = null;
    pinoLogger = null;
    warnedFileUnavailable = true;
    writeStdout(
      formatLogLine(now(), "warn", "start", strings.logFileUnavailable, err)
    );
    return {
      error(stage, message, err) {
        emit("error", stage, message, err);
      },
      info(stage, message, err) {
        emit("info", stage, message, err);
      },
      warn(stage, message, err) {
        emit("warn", stage, message, err);
      },
    };
  }

  try {
    rotateLogFile(logsDir, now());
  } catch (err) {
    writeStdout(
      formatLogLine(now(), "warn", "start", strings.logFileUnavailable, err)
    );
  }

  fileEnabled = true;
  try {
    if (pinoLib && pinoLib.pino && pinoLib.pretty) {
      fileDest = pinoLib.pino.destination({
        dest: livePath,
        mkdir: true,
        sync: true,
      });
      pinoLogger = pinoLib.pino(
        { base: null, timestamp: false },
        pinoLib.pino.multistream([
          { stream: createPretty(pinoLib.pretty, stdout) },
          { stream: createPretty(pinoLib.pretty, fileDest) },
        ])
      );
    }
  } catch (err) {
    pinoLogger = null;
    fileDest = null;
    writeStdout(
      formatLogLine(now(), "warn", "start", strings.logFileUnavailable, err)
    );
  }

  return {
    error(stage, message, err) {
      emit("error", stage, message, err);
    },
    info(stage, message, err) {
      emit("info", stage, message, err);
    },
    warn(stage, message, err) {
      emit("warn", stage, message, err);
    },
  };
}

let defaultLogger;

function getDefaultLogger() {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

module.exports = {
  BACKUP_NAME_RE,
  LIVE_LOG_NAME,
  MAX_BACKUP_FILES,
  MAX_FILE_BYTES,
  MAX_STDIO_CHARS,
  collapseStdio,
  createLogger,
  defaultLogsDir,
  error: (stage, message, err) =>
    getDefaultLogger().error(stage, message, err),
  formatBackupName,
  formatCause,
  formatLogLine,
  formatTimestamp,
  info: (stage, message, err) => getDefaultLogger().info(stage, message, err),
  rotateLogFile,
  warn: (stage, message, err) => getDefaultLogger().warn(stage, message, err),
};
