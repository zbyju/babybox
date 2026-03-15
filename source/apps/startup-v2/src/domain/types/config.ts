/**
 * Configuration types with Zod validation.
 */

import { z } from "zod";
import type { AbsolutePath } from "./branded.js";

// Zod schemas for runtime validation
export const StartupConfigSchema = z.object({
  // Paths
  repositoryPath: z.string().min(1),
  distPath: z.string().min(1),
  distBackupPath: z.string().min(1),
  logsPath: z.string().min(1),

  // Timeouts
  gitTimeoutMs: z.number().int().positive().default(30000),
  buildTimeoutMs: z.number().int().positive().default(300000), // 5 min
  processStartTimeoutMs: z.number().int().positive().default(10000),

  // Retry configuration
  maxRetries: z.number().int().min(0).max(10).default(5),
  retryDelayMs: z.number().int().positive().default(5000),

  // Process names
  mainProcessName: z.string().default("babybox"),
  configerProcessName: z.string().default("configer"),

  // Feature flags
  enableAutoUpdate: z.boolean().default(true),
  enableRollback: z.boolean().default(true),
});

export type StartupConfigInput = z.input<typeof StartupConfigSchema>;
export type StartupConfig = z.output<typeof StartupConfigSchema>;

// Default configuration factory
export function createDefaultConfig(basePath: AbsolutePath): StartupConfig {
  return StartupConfigSchema.parse({
    repositoryPath: basePath,
    distPath: `${basePath}/dist`,
    distBackupPath: `${basePath}/dist-backup`,
    logsPath: `${basePath}/source/apps/startup-v2/logs`,
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    configerProcessName: "configer",
    enableAutoUpdate: true,
    enableRollback: true,
  });
}

// Environment-based configuration
export const EnvConfigSchema = z.object({
  BABYBOX_REPO_PATH: z.string().optional(),
  BABYBOX_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  BABYBOX_MAX_RETRIES: z.coerce.number().int().min(0).max(10).optional(),
});

export type EnvConfig = z.output<typeof EnvConfigSchema>;
