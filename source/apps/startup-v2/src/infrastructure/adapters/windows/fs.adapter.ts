/**
 * File system adapter for Windows.
 * TODO: Implement Windows-specific path handling.
 */

import { err } from "neverthrow";
import type { FileSystemPort } from "../../../application/ports/fs.port";

export function createWindowsFsAdapter(): FileSystemPort {
  const notImplementedAsync = async () =>
    err({
      operation: "notImplemented",
      path: "",
      message: "Windows fs adapter neni implementovan",
    });

  const notImplementedSync = () =>
    err({
      operation: "notImplemented",
      path: "",
      message: "Windows fs adapter neni implementovan",
    });

  return {
    exists: () => false,
    isDirectory: () => notImplementedSync(),
    createDirectory: () => notImplementedAsync(),
    remove: () => notImplementedAsync(),
    rename: () => notImplementedAsync(),
    copyFile: () => notImplementedSync(),
    copyDirectory: () => notImplementedAsync(),
    listDirectory: () => notImplementedAsync(),
  };
}
