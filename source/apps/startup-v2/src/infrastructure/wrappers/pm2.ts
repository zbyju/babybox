/**
 * PM2 process manager wrapper.
 * All operations return Result types - never throws.
 */

import { type Result, ok, err } from "neverthrow";
import { executeCommand } from "./shell";
import type {
  ProcessName,
  ProcessStartResult,
  ProcessStopResult,
  DirectoryPath,
} from "../../domain/types/index";
import { shellCommand } from "../../domain/types/index";

export type PM2Error = {
  readonly operation: string;
  readonly processName: string;
  readonly message: string;
  readonly stderr?: string | undefined;
};

/**
 * Start a process with PM2.
 */
export async function pm2Start(
  name: ProcessName,
  script: string,
  cwd: DirectoryPath,
): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 start ${script} --name ${name as string}`);
  const result = await executeCommand(cmd, {
    cwd: cwd as unknown as DirectoryPath,
  });

  // executeCommand never fails (returns Result<ShellResult, never>)
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success": {
      // Try to extract PID from output
      const pidMatch = shellResult.stdout.match(/pid[:\s]+(\d+)/i);
      const pid = pidMatch ? Number.parseInt(pidMatch[1] ?? "0", 10) : 0;
      return ok({ kind: "started", pid });
    }

    case "non_zero_exit":
      if (shellResult.stderr.includes("already") || shellResult.stdout.includes("already")) {
        return ok({ kind: "already_running", pid: 0 });
      }
      return err({
        operation: "pm2Start",
        processName: name as string,
        message: `PM2 start selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Start",
        processName: name as string,
        message: "PM2 start vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Start",
        processName: name as string,
        message: shellResult.message,
      });
  }
}

/**
 * Start a Bun process with PM2.
 */
export async function pm2StartBun(
  name: ProcessName,
  scriptPath: string,
  cwd: DirectoryPath,
): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 start bun --name ${name as string} -- ${scriptPath}`);
  const result = await executeCommand(cmd, {
    cwd: cwd as unknown as DirectoryPath,
  });
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success": {
      const pidMatch = shellResult.stdout.match(/pid[:\s]+(\d+)/i);
      const pid = pidMatch ? Number.parseInt(pidMatch[1] ?? "0", 10) : 0;
      return ok({ kind: "started", pid });
    }

    case "non_zero_exit":
      if (shellResult.stderr.includes("already") || shellResult.stdout.includes("already")) {
        return ok({ kind: "already_running", pid: 0 });
      }
      return err({
        operation: "pm2StartBun",
        processName: name as string,
        message: `PM2 start selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2StartBun",
        processName: name as string,
        message: "PM2 start vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2StartBun",
        processName: name as string,
        message: shellResult.message,
      });
  }
}

/**
 * Stop a process with PM2.
 */
export async function pm2Stop(name: ProcessName): Promise<Result<ProcessStopResult, PM2Error>> {
  const cmd = shellCommand(`pm2 stop ${name as string}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "stopped" });

    case "non_zero_exit":
      if (shellResult.stderr.includes("not found") || shellResult.stdout.includes("not found")) {
        return ok({ kind: "not_running" });
      }
      return err({
        operation: "pm2Stop",
        processName: name as string,
        message: `PM2 stop selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Stop",
        processName: name as string,
        message: "PM2 stop vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Stop",
        processName: name as string,
        message: shellResult.message,
      });
  }
}

/**
 * Delete a process from PM2.
 */
export async function pm2Delete(name: ProcessName): Promise<Result<ProcessStopResult, PM2Error>> {
  const cmd = shellCommand(`pm2 delete ${name as string}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "stopped" });

    case "non_zero_exit":
      if (shellResult.stderr.includes("not found") || shellResult.stdout.includes("not found")) {
        return ok({ kind: "not_running" });
      }
      return err({
        operation: "pm2Delete",
        processName: name as string,
        message: `PM2 delete selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Delete",
        processName: name as string,
        message: "PM2 delete vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Delete",
        processName: name as string,
        message: shellResult.message,
      });
  }
}

/**
 * Check if PM2 is installed.
 */
export async function pm2IsInstalled(): Promise<boolean> {
  const result = await executeCommand(shellCommand("pm2 --version"));
  const shellResult = result._unsafeUnwrap();
  return shellResult.kind === "success";
}

/**
 * Restart a process with PM2.
 */
export async function pm2Restart(name: ProcessName): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 restart ${name as string}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "started", pid: 0 });

    case "non_zero_exit":
      return err({
        operation: "pm2Restart",
        processName: name as string,
        message: `PM2 restart selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Restart",
        processName: name as string,
        message: "PM2 restart vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Restart",
        processName: name as string,
        message: shellResult.message,
      });
  }
}
