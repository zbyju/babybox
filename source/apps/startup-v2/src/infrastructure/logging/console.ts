/**
 * Console logger - human-readable output to terminal.
 */

import type { LogEntry, LogLevel } from "../../domain/types/logging";
import { LogEntry as LogEntryFactory } from "../../domain/types/logging";
import type { Suggestion } from "../../domain/types/suggestion";
import type { LoggerPort } from "../../application/ports/logger.port";

const LEVEL_COLORS = {
  debug: "\x1b[90m", // Gray
  info: "\x1b[36m", // Cyan
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
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
      const scopeInfo =
        suggestion.scope.kind === "global" ? "" : ` (ve slozce: ${suggestion.scope.path})`;
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
