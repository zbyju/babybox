/**
 * Shell command execution wrapper.
 * Wraps Bun.spawn and NEVER throws.
 */

import { type Result, ok } from "neverthrow";
import type { ShellCommand, ShellOptions, ShellResult, DurationMs } from "../../domain/types/index";
import { ShellResult as SR, durationMs } from "../../domain/types/index";

/**
 * Execute a shell command safely.
 * Returns Result - never throws.
 */
export async function executeCommand(
  command: ShellCommand,
  options: ShellOptions = {}
): Promise<Result<ShellResult, never>> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? (30000 as DurationMs);

  try {
    // Parse command into parts
    const parts = parseCommand(command);
    if (parts.length === 0) {
      return ok(SR.spawnError("Prazdny prikaz"));
    }

    const [cmd, ...args] = parts;

    // Ensure cmd is defined (TypeScript narrowing)
    if (cmd === undefined) {
      return ok(SR.spawnError("Prazdny prikaz"));
    }

    // Create subprocess
    const spawnOptions: {
      cwd?: string;
      env?: Record<string, string | undefined>;
      stdout: "pipe";
      stderr: "pipe";
    } = {
      stdout: "pipe",
      stderr: "pipe",
    };
    
    if (options.cwd !== undefined) {
      spawnOptions.cwd = options.cwd as string;
    }
    if (options.env !== undefined) {
      spawnOptions.env = { ...process.env, ...options.env };
    }

    const proc = Bun.spawn([cmd, ...args], spawnOptions);

    // Set up timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeoutMs);

    // Collect output
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    // Read stdout
    if (proc.stdout) {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stdoutChunks.push(decoder.decode(value));
        }
      } catch {
        // Ignore read errors
      }
    }

    // Read stderr
    if (proc.stderr) {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stderrChunks.push(decoder.decode(value));
        }
      } catch {
        // Ignore read errors
      }
    }

    // Wait for process to exit
    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const duration = durationMs(Date.now() - startTime);
    const stdout = stdoutChunks.join("");
    const stderr = stderrChunks.join("");

    if (timedOut) {
      return ok(SR.timeout(stdout, stderr, timeoutMs));
    }

    if (exitCode === 0) {
      return ok(SR.success(stdout, stderr, duration));
    }

    return ok(SR.nonZeroExit(stdout, stderr, exitCode, duration));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return ok(SR.spawnError(message));
  }
}

/**
 * Parse a shell command string into parts.
 * Handles basic quoting.
 */
function parseCommand(command: ShellCommand): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote: "'" | '"' | null = null;

  for (const char of command) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Execute a command in a specific directory.
 */
export async function executeInDirectory(
  command: ShellCommand,
  directory: string,
  timeoutMs?: DurationMs
): Promise<Result<ShellResult, never>> {
  const opts: ShellOptions = timeoutMs !== undefined
    ? { cwd: directory as ShellOptions["cwd"], timeoutMs }
    : { cwd: directory as ShellOptions["cwd"] };
  return executeCommand(command, opts);
}
