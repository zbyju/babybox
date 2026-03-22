/**
 * File logger - JSON structured logs persisted to disk.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { LogEntry, LogLevel } from "../../domain/types/index";
import { LogEntry as LogEntryFactory } from "../../domain/types/index";
import type { LoggerPort } from "../../application/ports/logger.port";
import type { Result } from "neverthrow";
import { ok, err } from "neverthrow";

type FileLoggerConfig = {
  readonly logDir: string;
  readonly filePrefix: string;
  readonly maxFileSizeBytes: number;
  readonly level: LogLevel;
};

const DEFAULT_CONFIG: FileLoggerConfig = {
  logDir: "../../logs",
  filePrefix: "startup",
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  level: "info",
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogFileName(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${prefix}.${year}-${month}-${day}.log`;
}

function formatEntryAsJson(entry: LogEntry): string {
  return `${JSON.stringify(entry)}\n`;
}

async function ensureLogDir(dir: string): Promise<Result<void, string>> {
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(`Nelze vytvorit adresar pro logy: ${message}`);
  }
}

async function writeToFile(filePath: string, content: string): Promise<Result<void, string>> {
  try {
    await appendFile(filePath, content, "utf-8");
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(`Nelze zapsat do log souboru: ${message}`);
  }
}

export function createFileLogger(config: Partial<FileLoggerConfig> = {}): LoggerPort {
  const cfg: FileLoggerConfig = { ...DEFAULT_CONFIG, ...config };
  let currentLevel = cfg.level;
  let pendingWrites: Promise<void>[] = [];
  let initialized = false;

  async function initialize(): Promise<void> {
    if (initialized) return;
    const result = await ensureLogDir(cfg.logDir);
    if (result.isErr()) {
      // Log to console as fallback - don't throw
      console.error(`[FileLogger] ${result.error}`);
    }
    initialized = true;
  }

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
  }

  function log(entry: LogEntry): void {
    if (!shouldLog(entry.level)) return;

    const filePath = `${cfg.logDir}/${getLogFileName(cfg.filePrefix)}`;
    const content = formatEntryAsJson(entry);

    const writePromise = (async () => {
      await initialize();
      const result = await writeToFile(filePath, content);
      if (result.isErr()) {
        // Log to console as fallback - don't throw
        console.error(`[FileLogger] ${result.error}`);
      }
    })();

    pendingWrites.push(writePromise);
  }

  return {
    debug: (module, message, context) => {
      log(LogEntryFactory.debug(module, message, context));
    },
    info: (module, message, context) => {
      log(LogEntryFactory.info(module, message, context));
    },
    warn: (module, message, suggestions, context) => {
      log(LogEntryFactory.warn(module, message, suggestions, context));
    },
    error: (module, message, suggestions, context) => {
      log(LogEntryFactory.error(module, message, suggestions, context));
    },
    log,
    flush: async () => {
      await Promise.all(pendingWrites);
      pendingWrites = [];
    },
    setLevel: (level) => {
      currentLevel = level;
    },
  };
}
