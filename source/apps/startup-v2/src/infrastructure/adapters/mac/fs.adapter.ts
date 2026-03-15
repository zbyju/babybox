/**
 * File system adapter for macOS.
 */

import { createUbuntuFsAdapter } from "../ubuntu/fs.adapter.js";
import type { FileSystemPort } from "../../../application/ports/fs.port.js";

export function createMacFsAdapter(): FileSystemPort {
  // macOS uses same POSIX filesystem operations
  return createUbuntuFsAdapter();
}
