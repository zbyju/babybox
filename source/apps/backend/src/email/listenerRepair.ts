import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

export async function repairListenerPermission(): Promise<void> {
  if (process.platform !== "linux" || !process.versions["bun"])
    throw new Error("Expected Linux Bun runtime");
  const bun = join(homedir(), ".bun", "bin", "bun");
  if (
    (await realpath(bun)) !== bun ||
    (await realpath(process.execPath)) !== bun
  )
    throw new Error("Unexpected Bun executable");
  // Polkit requires local administrator approval. No command arguments come from HTTP.
  await promisify(execFile)(
    "/usr/bin/pkexec",
    ["/usr/sbin/setcap", "cap_net_bind_service=ep", bun],
    { timeout: 90_000 }
  );
}
