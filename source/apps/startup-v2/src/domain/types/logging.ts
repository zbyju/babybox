/**
 * Type-safe logging types.
 * All log entries are structured and typed.
 */

import type { Timestamp } from "./branded";
import type { Suggestion } from "./suggestion";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogModule =
  | "startup"
  | "update"
  | "build"
  | "override"
  | "process"
  | "install";

/**
 * A structured log entry.
 */
export type LogEntry = {
  readonly timestamp: Timestamp;
  readonly level: LogLevel;
  readonly module: LogModule;
  readonly message: string; // Czech message for user
  readonly technicalDetails?: string | undefined; // English technical details
  readonly suggestions: readonly Suggestion[];
  readonly context?: LogContext | undefined;
};

/**
 * Additional context for log entries.
 */
export type LogContext = {
  readonly operation?: string | undefined;
  readonly duration?: number | undefined;
  readonly exitCode?: number | undefined;
  readonly command?: string | undefined;
  readonly path?: string | undefined;
  readonly error?: SerializedError | undefined;
};

/**
 * Serialized error for logging (no Error objects).
 */
export type SerializedError = {
  readonly name: string;
  readonly message: string;
  readonly stack?: string | undefined;
};

type CreateOptions = {
  readonly technicalDetails?: string | undefined;
  readonly suggestions?: readonly Suggestion[] | undefined;
  readonly context?: LogContext | undefined;
};

// Constructor helpers
export const LogEntry = {
  create: (
    level: LogLevel,
    module: LogModule,
    message: string,
    options?: CreateOptions
  ): LogEntry => {
    const base = {
      timestamp: Date.now() as Timestamp,
      level,
      module,
      message,
      suggestions: options?.suggestions ?? [],
    };

    // Only add optional fields if they have values
    const result: LogEntry = options?.technicalDetails !== undefined
      ? options?.context !== undefined
        ? { ...base, technicalDetails: options.technicalDetails, context: options.context }
        : { ...base, technicalDetails: options.technicalDetails }
      : options?.context !== undefined
        ? { ...base, context: options.context }
        : base;

    return result;
  },

  debug: (module: LogModule, message: string, context?: LogContext): LogEntry =>
    context !== undefined
      ? LogEntry.create("debug", module, message, { context })
      : LogEntry.create("debug", module, message),

  info: (module: LogModule, message: string, context?: LogContext): LogEntry =>
    context !== undefined
      ? LogEntry.create("info", module, message, { context })
      : LogEntry.create("info", module, message),

  warn: (
    module: LogModule,
    message: string,
    suggestions?: readonly Suggestion[],
    context?: LogContext
  ): LogEntry => {
    const options: CreateOptions = {};
    if (suggestions !== undefined) {
      (options as { suggestions: readonly Suggestion[] }).suggestions = suggestions;
    }
    if (context !== undefined) {
      (options as { context: LogContext }).context = context;
    }
    return LogEntry.create("warn", module, message, options);
  },

  error: (
    module: LogModule,
    message: string,
    suggestions: readonly Suggestion[],
    context?: LogContext
  ): LogEntry =>
    context !== undefined
      ? LogEntry.create("error", module, message, { suggestions, context })
      : LogEntry.create("error", module, message, { suggestions }),
} as const;

/**
 * Serialize an Error object for logging.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const result: SerializedError = {
      name: error.name,
      message: error.message,
    };
    if (error.stack !== undefined) {
      return { ...result, stack: error.stack };
    }
    return result;
  }
  return {
    name: "UnknownError",
    message: String(error),
  };
}
