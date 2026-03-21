/**
 * Package manager adapter for macOS.
 */

import { createUbuntuPackageManagerAdapter } from "../ubuntu/package-manager.adapter.js";
import type { PackageManagerPort } from "../../../application/ports/package-manager.port.js";

export function createMacPackageManagerAdapter(): PackageManagerPort {
  // Bun works the same on macOS
  return createUbuntuPackageManagerAdapter();
}
