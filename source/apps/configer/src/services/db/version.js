import { JSONFile, Low } from "lowdb";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
export async function versionConfig() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const file = join(__dirname, "../../../configs/versions.json");
    const adapter = new JSONFile(file);
    const db = new Low(adapter);
    await db.read();
    return {
        data: () => db.data,
    };
}
