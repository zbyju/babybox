# Project 2: Logging System

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Implement type-safe logging with console and file output |
| **Risk** | Low |
| **Effort** | 1 day |
| **Dependencies** | #1 Domain Types |
| **Unlocks** | All other projects need logging |

## Design Goals

1. **Type-safe** - All log entries are typed, no string concatenation
2. **Structured** - JSON format for file logs, human-readable for console
3. **Suggestions** - Every error includes actionable suggestions
4. **Czech messages** - All user-facing text in Czech
5. **Persistent** - Logs saved to files with rotation
6. **No throw** - Logging never throws errors

## Tasks

### 2.1 Logger Port Interface

#### src/application/ports/logger.port.ts

```typescript
/**
 * Logger port - interface for logging implementations.
 */

import type { LogEntry, LogLevel, LogModule, LogContext } from "@domain/types";
import type { Suggestion } from "@domain/types";

/**
 * Port interface for logging.
 * Implementations can write to console, file, or both.
 */
export type LoggerPort = {
  readonly debug: (module: LogModule, message: string, context?: LogContext) => void;
  readonly info: (module: LogModule, message: string, context?: LogContext) => void;
  readonly warn: (
    module: LogModule,
    message: string,
    suggestions?: readonly Suggestion[],
    context?: LogContext
  ) => void;
  readonly error: (
    module: LogModule,
    message: string,
    suggestions: readonly Suggestion[],
    context?: LogContext
  ) => void;
  readonly log: (entry: LogEntry) => void;
  readonly flush: () => Promise<void>;
  readonly setLevel: (level: LogLevel) => void;
};
```

### 2.2 Console Logger Implementation

#### src/infrastructure/logging/console.ts

```typescript
/**
 * Console logger - human-readable output to terminal.
 */

import type { LogEntry, LogLevel, LogModule, LogContext, Suggestion } from "@domain/types";
import { LogEntry as LogEntryFactory, timestamp } from "@domain/types";
import type { LoggerPort } from "@application/ports/logger.port";

const LEVEL_COLORS = {
  debug: "\x1b[90m",  // Gray
  info: "\x1b[36m",   // Cyan
  warn: "\x1b[33m",   // Yellow
  error: "\x1b[31m",  // Red
} as const;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatSuggestion(suggestion: Suggestion, index: number): string {
  const prefix = `   ${index + 1}. `;
  
  switch (suggestion.kind) {
    case "terminal": {
      const scopeInfo = suggestion.scope.kind === "global" 
        ? "" 
        : ` (ve slozce: ${suggestion.scope.path})`;
      return `${prefix}${suggestion.message}${scopeInfo}\n      $ ${BOLD}${suggestion.command}${RESET}`;
    }
    case "manual_action":
      return `${prefix}${suggestion.message}`;
    case "documentation":
      return suggestion.url 
        ? `${prefix}${suggestion.message}\n      -> ${suggestion.url}`
        : `${prefix}${suggestion.message}`;
    case "contact_support":
      return `${prefix}${suggestion.message} [${suggestion.severity.toUpperCase()}]`;
  }
}

function formatEntry(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const time = formatTimestamp(entry.timestamp);
  const level = entry.level.toUpperCase().padEnd(5);
  const module = entry.module.padEnd(10);
  
  let output = `${DIM}${time}${RESET} ${color}${level}${RESET} ${DIM}[${module}]${RESET} ${entry.message}`;
  
  if (entry.technicalDetails) {
    output += `\n${DIM}   Detaily: ${entry.technicalDetails}${RESET}`;
  }
  
  if (entry.context) {
    const ctx = entry.context;
    const parts: string[] = [];
    if (ctx.operation) parts.push(`operace=${ctx.operation}`);
    if (ctx.duration !== undefined) parts.push(`doba=${ctx.duration}ms`);
    if (ctx.exitCode !== undefined) parts.push(`kod=${ctx.exitCode}`);
    if (ctx.path) parts.push(`cesta=${ctx.path}`);
    if (parts.length > 0) {
      output += `\n${DIM}   Kontext: ${parts.join(", ")}${RESET}`;
    }
    if (ctx.error) {
      output += `\n${DIM}   Chyba: ${ctx.error.name}: ${ctx.error.message}${RESET}`;
    }
  }
  
  if (entry.suggestions.length > 0) {
    output += `\n${BOLD}   Navrhy reseni:${RESET}`;
    entry.suggestions.forEach((s, i) => {
      output += `\n${formatSuggestion(s, i)}`;
    });
  }
  
  return output;
}

export function createConsoleLogger(initialLevel: LogLevel = "info"): LoggerPort {
  let currentLevel = initialLevel;

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
  }

  function log(entry: LogEntry): void {
    if (!shouldLog(entry.level)) return;
    
    const formatted = formatEntry(entry);
    
    switch (entry.level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
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
      // Console doesn't need flushing
    },
    setLevel: (level) => {
      currentLevel = level;
    },
  };
}
```

### 2.3 File Logger Implementation

#### src/infrastructure/logging/file.ts

```typescript
/**
 * File logger - JSON structured logs persisted to disk.
 */

import { appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { LogEntry, LogLevel, LogModule, LogContext, Suggestion } from "@domain/types";
import { LogEntry as LogEntryFactory, timestamp } from "@domain/types";
import type { LoggerPort } from "@application/ports/logger.port";
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
  return JSON.stringify(entry) + "\n";
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

async function writeToFile(
  filePath: string,
  content: string
): Promise<Result<void, string>> {
  try {
    await appendFile(filePath, content, "utf-8");
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(`Nelze zapsat do log souboru: ${message}`);
  }
}

export function createFileLogger(
  config: Partial<FileLoggerConfig> = {}
): LoggerPort {
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
```

### 2.4 Combined Logger

#### src/infrastructure/logging/combined.ts

```typescript
/**
 * Combined logger - writes to both console and file.
 */

import type { LogEntry, LogLevel, LogModule, LogContext, Suggestion } from "@domain/types";
import type { LoggerPort } from "@application/ports/logger.port";
import { createConsoleLogger } from "./console";
import { createFileLogger } from "./file";

type CombinedLoggerConfig = {
  readonly logDir: string;
  readonly filePrefix: string;
  readonly consoleLevel: LogLevel;
  readonly fileLevel: LogLevel;
};

const DEFAULT_CONFIG: CombinedLoggerConfig = {
  logDir: "../../logs",
  filePrefix: "startup",
  consoleLevel: "info",
  fileLevel: "debug", // File captures more detail
};

export function createCombinedLogger(
  config: Partial<CombinedLoggerConfig> = {}
): LoggerPort {
  const cfg: CombinedLoggerConfig = { ...DEFAULT_CONFIG, ...config };
  
  const consoleLogger = createConsoleLogger(cfg.consoleLevel);
  const fileLogger = createFileLogger({
    logDir: cfg.logDir,
    filePrefix: cfg.filePrefix,
    level: cfg.fileLevel,
  });

  return {
    debug: (module, message, context) => {
      consoleLogger.debug(module, message, context);
      fileLogger.debug(module, message, context);
    },
    info: (module, message, context) => {
      consoleLogger.info(module, message, context);
      fileLogger.info(module, message, context);
    },
    warn: (module, message, suggestions, context) => {
      consoleLogger.warn(module, message, suggestions, context);
      fileLogger.warn(module, message, suggestions, context);
    },
    error: (module, message, suggestions, context) => {
      consoleLogger.error(module, message, suggestions, context);
      fileLogger.error(module, message, suggestions, context);
    },
    log: (entry) => {
      consoleLogger.log(entry);
      fileLogger.log(entry);
    },
    flush: async () => {
      await consoleLogger.flush();
      await fileLogger.flush();
    },
    setLevel: (level) => {
      consoleLogger.setLevel(level);
      fileLogger.setLevel(level);
    },
  };
}
```

### 2.5 Czech Message Constants

#### src/presentation/messages.ts

```typescript
/**
 * All user-facing messages in Czech.
 * Organized by module/feature.
 */

export const Messages = {
  // Startup messages
  startup: {
    starting: "Spoustim Babybox startup aplikaci...",
    completed: "Startup uspesne dokoncen.",
    failed: "Startup selhal.",
    alreadyRunning: "Aplikace jiz bezi.",
  },

  // Update messages
  update: {
    checking: "Kontroluji aktualizace...",
    pulling: "Stahuji nove zmeny z repozitare...",
    upToDate: "Aplikace je aktualni.",
    updated: (commits: number) => `Stazeno ${commits} novych commitu.`,
    networkError: "Nelze se pripojit k repozitari. Zkontrolujte pripojeni k internetu.",
    conflictDetected: "Detekovany konflikty pri aktualizaci.",
    stashingChanges: "Ukladam lokalni zmeny do stashe...",
    stashSuccess: "Lokalni zmeny ulozeny.",
    stashFailed: "Nelze ulozit lokalni zmeny.",
    proceedingWithoutChanges: "Pokracuji bez lokalnich zmen.",
  },

  // Build messages
  build: {
    starting: "Spoustim build aplikace...",
    installingDeps: "Instaluji zavislosti...",
    compiling: "Kompiluji zdrojove kody...",
    success: (durationMs: number) => `Build uspesne dokoncen za ${Math.round(durationMs / 1000)}s.`,
    failed: "Build selhal.",
    depsFailed: "Instalace zavislosti selhala.",
  },

  // Override/deployment messages
  override: {
    starting: "Nasazuji novou verzi...",
    backingUp: "Vytvarim zalohu aktualni verze...",
    copying: "Kopiruji nove soubory...",
    success: "Nova verze uspesne nasazena.",
    failed: "Nasazeni selhalo.",
    rollingBack: "Provadim rollback na predchozi verzi...",
    rollbackSuccess: "Rollback uspesny, pouziva se predchozi verze.",
    rollbackFailed: "Rollback selhal! Aplikace muze byt v nekonzistentnim stavu.",
  },

  // Process messages
  process: {
    starting: (name: string) => `Spoustim sluzbu ${name}...`,
    started: (name: string) => `Sluzba ${name} uspesne spustena.`,
    stopping: (name: string) => `Zastavuji sluzbu ${name}...`,
    stopped: (name: string) => `Sluzba ${name} zastavena.`,
    failed: (name: string) => `Spusteni sluzby ${name} selhalo.`,
    retrying: (name: string, attempt: number) => 
      `Pokus o spusteni ${name} (#${attempt})...`,
    alreadyRunning: (name: string) => `Sluzba ${name} jiz bezi.`,
  },

  // Install messages
  install: {
    starting: "Spoustim instalaci...",
    checkingPrerequisites: "Kontroluji pozadavky...",
    prerequisiteMissing: (name: string) => `Chybi pozadovana zavislost: ${name}`,
    installing: (name: string) => `Instaluji ${name}...`,
    success: "Instalace uspesne dokoncena.",
    failed: "Instalace selhala.",
  },

  // Suggestion messages
  suggestions: {
    checkNetwork: "Zkontrolujte pripojeni k internetu a zkuste to znovu.",
    checkDiskSpace: "Zkontrolujte volne misto na disku.",
    restartMachine: "Restartujte pocitac a zkuste to znovu.",
    contactSupport: "Kontaktujte technickou podporu.",
    runCommand: (cmd: string) => `Spustte nasledujici prikaz: ${cmd}`,
    checkPermissions: (path: string) => `Zkontrolujte opravneni k ${path}.`,
    stashChanges: "Ulozte lokalni zmeny pouzitim 'git stash'.",
    discardChanges: "Zahodte lokalni zmeny pouzitim 'git checkout -- .'",
    manualPull: "Zkuste rucne stahnout zmeny pouzitim 'git pull'.",
  },

  // General
  general: {
    error: "Chyba",
    warning: "Varovani",
    success: "Uspech",
    duration: (ms: number) => `Doba trvani: ${Math.round(ms / 1000)}s`,
  },
} as const;
```

### 2.6 Index Exports

#### src/infrastructure/logging/index.ts

```typescript
export { createConsoleLogger } from "./console";
export { createFileLogger } from "./file";
export { createCombinedLogger } from "./combined";
```

## Verification Checklist

- [x] Console logger displays colored output
- [x] File logger creates log files in correct location
- [x] Combined logger writes to both
- [x] Log files are valid JSON (one entry per line)
- [x] Suggestions are properly formatted
- [x] Czech messages display correctly (UTF-8)
- [x] Logging never throws errors

## Test File

#### src/infrastructure/logging/logging.test.ts

```typescript
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { rm, readFile } from "fs/promises";
import { existsSync } from "fs";
import { createConsoleLogger } from "./console";
import { createFileLogger } from "./file";
import { createCombinedLogger } from "./combined";
import { Suggestion, shellCommand } from "@domain/types";

const TEST_LOG_DIR = "./test-logs";

describe("console logger", () => {
  it("logs at different levels", () => {
    const logger = createConsoleLogger("debug");
    
    // These should not throw
    logger.debug("startup", "Debug message");
    logger.info("startup", "Info message");
    logger.warn("startup", "Warning message", []);
    logger.error("startup", "Error message", []);
  });

  it("respects log level", () => {
    const logger = createConsoleLogger("error");
    
    // These should be filtered out (no console output)
    logger.debug("startup", "Debug");
    logger.info("startup", "Info");
    logger.warn("startup", "Warn", []);
    
    // Only this should output
    logger.error("startup", "Error", []);
  });
});

describe("file logger", () => {
  beforeEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  it("creates log files", async () => {
    const logger = createFileLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "test",
      level: "debug",
    });

    logger.info("startup", "Test message");
    await logger.flush();

    const files = await Bun.file(TEST_LOG_DIR).exists();
    // Check that some file was created
    expect(existsSync(TEST_LOG_DIR)).toBe(true);
  });

  it("writes valid JSON", async () => {
    const logger = createFileLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "test",
      level: "debug",
    });

    logger.info("startup", "Test message");
    await logger.flush();

    const date = new Date();
    const fileName = `test.${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.log`;
    
    const content = await readFile(`${TEST_LOG_DIR}/${fileName}`, "utf-8");
    const entry = JSON.parse(content.trim());
    
    expect(entry.level).toBe("info");
    expect(entry.module).toBe("startup");
    expect(entry.message).toBe("Test message");
  });
});

describe("combined logger", () => {
  beforeEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  it("writes to both console and file", async () => {
    const logger = createCombinedLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "combined",
      consoleLevel: "info",
      fileLevel: "debug",
    });

    logger.info("startup", "Combined test");
    await logger.flush();

    expect(existsSync(TEST_LOG_DIR)).toBe(true);
  });
});
```

Run tests:
```bash
bun test src/infrastructure/logging/logging.test.ts
```
