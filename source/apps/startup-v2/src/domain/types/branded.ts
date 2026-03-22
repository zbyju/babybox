/**
 * Branded types for nominal typing.
 * Prevents accidentally mixing different string types.
 */

// Brand symbol for compile-time type safety
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

// Path types
export type AbsolutePath = Brand<string, "AbsolutePath">;
export type RelativePath = Brand<string, "RelativePath">;
export type DirectoryPath = Brand<string, "DirectoryPath">;
export type FilePath = Brand<string, "FilePath">;

// Command types
export type ShellCommand = Brand<string, "ShellCommand">;
export type ProcessName = Brand<string, "ProcessName">;

// Git types
export type GitBranch = Brand<string, "GitBranch">;
export type GitRemote = Brand<string, "GitRemote">;
export type GitCommitHash = Brand<string, "GitCommitHash">;

// Time types
export type Timestamp = Brand<number, "Timestamp">;
export type DurationMs = Brand<number, "DurationMs">;

// Smart constructors - validate and create branded types
export function absolutePath(path: string): AbsolutePath | null {
  if (path.startsWith("/") || /^[A-Z]:\\/.test(path)) {
    return path as AbsolutePath;
  }
  return null;
}

export function relativePath(path: string): RelativePath | null {
  if (!path.startsWith("/") && !/^[A-Z]:\\/.test(path)) {
    return path as RelativePath;
  }
  return null;
}

export function shellCommand(cmd: string): ShellCommand {
  return cmd as ShellCommand;
}

export function processName(name: string): ProcessName {
  return name as ProcessName;
}

export function timestamp(ms: number): Timestamp {
  return ms as Timestamp;
}

export function durationMs(ms: number): DurationMs {
  return ms as DurationMs;
}

export function gitBranch(name: string): GitBranch {
  return name as GitBranch;
}

export function directoryPath(path: string): DirectoryPath {
  return path as DirectoryPath;
}
