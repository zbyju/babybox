/**
 * Process port - interface for process management.
 */

import type { Result } from "neverthrow";
import type {
  ProcessName,
  ProcessStartResult,
  ProcessStopResult,
  DirectoryPath,
} from "../../domain/types/index";

export type ProcessError = {
  readonly operation: string;
  readonly processName: string;
  readonly message: string;
};

export type ProcessPort = {
  readonly start: (
    name: ProcessName,
    script: string,
    cwd: DirectoryPath,
  ) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly startBun: (
    name: ProcessName,
    scriptPath: string,
    cwd: DirectoryPath,
  ) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly stop: (name: ProcessName) => Promise<Result<ProcessStopResult, ProcessError>>;

  readonly delete: (name: ProcessName) => Promise<Result<ProcessStopResult, ProcessError>>;

  readonly restart: (name: ProcessName) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly isManagerInstalled: () => Promise<boolean>;
};
