import { JSONFile, Low } from "lowdb";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VersionConfig {
  backend: string;
  frontend: string;
  configer: string;
  startup: string;
}

export type VersionDb = ReturnType<typeof versionConfig>;

export async function versionConfig() {
  const file = join(__dirname, "../../../configs/versions.json");
  const adapter = new JSONFile<VersionConfig>(file);
  const db = new Low(adapter);
  await db.read();

  return {
    data: () => db.data,
  };
}
