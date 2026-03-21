/**
 * File system adapter for Ubuntu.
 */

import { ok, err } from "neverthrow";
import type { FileSystemPort } from "../../../application/ports/fs.port.js";
import * as fs from "../../wrappers/fs.js";

export function createUbuntuFsAdapter(): FileSystemPort {
  return {
    exists: (path) => fs.pathExists(path),

    isDirectory: (path) => {
      const result = fs.isDirectory(path);
      if (result.isErr()) {
        return err({
          operation: "isDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    createDirectory: async (path) => {
      const result = await fs.createDirectoryAsync(path);
      if (result.isErr()) {
        return err({
          operation: "createDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },

    remove: async (path, recursive = false) => {
      const result = await fs.removePathAsync(path, { recursive });
      if (result.isErr()) {
        return err({
          operation: "remove",
          path,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },

    rename: async (oldPath, newPath) => {
      const result = await fs.renamePathAsync(oldPath, newPath);
      if (result.isErr()) {
        return err({
          operation: "rename",
          path: `${oldPath} -> ${newPath}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },

    copyFile: (src, dest) => {
      const result = fs.copyFilePath(src, dest);
      if (result.isErr()) {
        return err({
          operation: "copyFile",
          path: `${src} -> ${dest}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },

    copyDirectory: async (src, dest) => {
      const result = await fs.copyDirectoryAsync(src, dest);
      if (result.isErr()) {
        return err({
          operation: "copyDirectory",
          path: `${src} -> ${dest}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },

    listDirectory: async (path) => {
      const result = await fs.listDirectoryAsync(path);
      if (result.isErr()) {
        return err({
          operation: "listDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },
  };
}
