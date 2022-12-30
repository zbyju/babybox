import express from "express";
import * as dotenv from "dotenv";
// import { Low } from "lowdb";
import { JSONFile, Low } from "lowdb";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  // Load .env
  dotenv.config();

  // Init lowdb
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const file = join(__dirname, "../configs/main.json");
  const adapter = new JSONFile(file);
  const db = new Low(adapter);

  await db.read();

  const app = express();
  const port = process.env.PORT || 6000;
  app.listen(port, () => {
    const color =
      process.env.NODE_ENV === "production" ? "\x1b[32m" : "\x1b[35m";

    console.log(
      `Babybox backend running in ${color}\x1b[1m%s\x1b[0m and listening on port \x1b[1m%s`,
      process.env.NODE_ENV,
      port
    );
  });
}
main();
