import { JSONFile, Low } from "lowdb";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MainConfig } from "../../src/types/main.types.js";

export async function mainConfig() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const file = join(__dirname, "../../configs/main.json");
  const adapter = new JSONFile<MainConfig>(file);
  const db = new Low(adapter);

  await db.read();

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
