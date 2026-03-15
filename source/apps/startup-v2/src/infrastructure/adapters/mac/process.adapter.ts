/**
 * Process adapter for macOS.
 */

import { createUbuntuProcessAdapter } from "../ubuntu/process.adapter.js";
import type { ProcessPort } from "../../../application/ports/process.port.js";

export function createMacProcessAdapter(): ProcessPort {
  // PM2 works the same on macOS
  return createUbuntuProcessAdapter();
}
