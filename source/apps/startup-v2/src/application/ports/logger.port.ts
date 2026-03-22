/**
 * Logger port - interface for logging implementations.
 */

import type {
  LogEntry,
  LogLevel,
  LogModule,
  LogContext,
  Suggestion,
} from "../../domain/types/index";

/**
 * Port interface for logging.
 * Implementations can write to console, file, or both.
 */
export type LoggerPort = {
  readonly debug: (
    module: LogModule,
    message: string,
    context?: LogContext
  ) => void;
  readonly info: (
    module: LogModule,
    message: string,
    context?: LogContext
  ) => void;
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
