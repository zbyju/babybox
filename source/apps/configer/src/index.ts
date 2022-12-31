import express from "express";
import * as dotenv from "dotenv";
// import { Low } from "lowdb";
import { JSONFile, Low } from "lowdb";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mainConfig } from "../services/db/main.js";
import { DbFactory } from "../services/db/factory.js";

async function main() {
  // Load .env
  dotenv.config();

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
