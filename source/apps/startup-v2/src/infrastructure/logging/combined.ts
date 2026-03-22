/**
 * Combined logger - writes to both console and file.
 */

import type { LogLevel } from "../../domain/types/index";
import type { LoggerPort } from "../../application/ports/logger.port";
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
