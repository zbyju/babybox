/**
 * Package manager adapter for Windows.
 * TODO: Implement Windows-specific Bun handling.
 */

import { err } from "neverthrow";
import type { PackageManagerPort } from "../../../application/ports/package-manager.port";

export function createWindowsPackageManagerAdapter(): PackageManagerPort {
  return {
    install: async () =>
      err("Windows package manager adapter neni implementovan"),
    build: async () =>
      err("Windows package manager adapter neni implementovan"),
    isInstalled: async () => false,
  };
}
