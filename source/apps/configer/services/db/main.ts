import { JSONFile, Low } from "lowdb";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MainConfig } from "../../src/types/main.types.js";
import { readFileSync } from "node:fs";
import merge from "lodash.merge";

export type MainDb = ReturnType<typeof mainConfig>;

export async function mainConfig() {
  // Init database
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const file = join(__dirname, "../../configs/main.json");
  const adapter = new JSONFile<MainConfig>(file);
  const db = new Low(adapter);
  await db.read();

  // Get base json
  const baseStr = readFileSync(
    join(__dirname, "../../configs/base.json"),
    "utf-8"
  );
  const base = JSON.parse(baseStr);

  // Merge base to db
  const merged = merge(base, db.data);
  db.data = merged;
  await db.write();

  async function update(c2: MainConfig): Promise<MainConfig> {
    db.data = c2;
    await db.write();
    return db.data;
  }

  return {
    data: () => db.data,
    update,
  };
}
