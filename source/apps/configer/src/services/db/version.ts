import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VersionConfig } from "../../../src/types/versions.types.js";

export type VersionDb = ReturnType<typeof versionConfig>;

export async function versionConfig() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const file = join(__dirname, "../../../configs/versions.json");
  const adapter = new JSONFile<VersionConfig | null>(file);
  /*
   * lowdb 7 wants default data. null keeps the lowdb 3 shape: a missing or
   * empty versions.json leaves db.data null, which the caller already reads.
   */
  const db = new Low<VersionConfig | null>(adapter, null);

  await db.read();

  return {
    data: () => db.data,
  };
}
