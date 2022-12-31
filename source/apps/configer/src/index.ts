import express from "express";
import * as dotenv from "dotenv";
// import { Low } from "lowdb";
import { JSONFile, Low } from "lowdb";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DbFactory } from "./services/db/factory.js";
import { router as configRoute } from "./routes/configRoute.js";
import cors from "cors";

async function main() {
  // Load .env
  dotenv.config();

  const main = await DbFactory.getMainDb();

  const app = express();

  // Allow cors
  app.use(
    cors({
      maxAge: 60 * 60 * 24 * 7,
    })
  );

  // Parse JSON in POST requests
  app.use(express.json());

  // Routes
  const prefix = main.data()?.configer.url || process.env.API_PREFIX;

  // Status route
  app.get(prefix + "/status", (req, res) => {
    res.status(200).send({
      msg: "Alive.",
    });
  });

  // Other routes
  app.use(prefix + "/config", configRoute);

  const port = main.data()?.configer.port || process.env.PORT || 6000;
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
