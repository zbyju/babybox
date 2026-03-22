/**
 * File system port - interface for file operations.
 */

import type { Result } from "neverthrow";

export type FsPortError = {
  readonly operation: string;
  readonly path: string;
  readonly message: string;
};

export type FileSystemPort = {
  readonly exists: (path: string) => boolean;
  readonly isDirectory: (path: string) => Result<boolean, FsPortError>;
  readonly createDirectory: (path: string) => Promise<Result<void, FsPortError>>;
  readonly remove: (path: string, recursive?: boolean) => Promise<Result<void, FsPortError>>;
  readonly rename: (oldPath: string, newPath: string) => Promise<Result<void, FsPortError>>;
  readonly copyFile: (src: string, dest: string) => Result<void, FsPortError>;
  readonly copyDirectory: (src: string, dest: string) => Promise<Result<void, FsPortError>>;
  readonly listDirectory: (path: string) => Promise<Result<string[], FsPortError>>;
};
