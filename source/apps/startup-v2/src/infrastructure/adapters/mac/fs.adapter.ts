/**
 * File system adapter for macOS.
 */

import { createUbuntuFsAdapter } from "../ubuntu/fs.adapter";
import type { FileSystemPort } from "../../../application/ports/fs.port";

export function createMacFsAdapter(): FileSystemPort {
  // macOS uses same POSIX filesystem operations
  return createUbuntuFsAdapter();
}
