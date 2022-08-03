import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as morgan from "morgan";
import open = require("open");

import { router as engineRoute } from "./routes/engineRoute";
import { router as thermalRoute } from "./routes/thermalRoute";
import { router as unitsRoute } from "./routes/unitsRoute";
import { checkInit } from "./utils/checkInit";

async function main() {
  // .env file load
  dotenv.config();

  // Check if .env file is ok, and server can run
  if (!checkInit()) {
    console.error(
      "Application did not start with correct env variables!",
      process.env
    );
    return 1;
  }

  const app = express();
  const port = process.env.PORT || 5000;

  // Setup logger - morgan
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // Allow cors
  app.use(cors());

  // Parse JSON in POST requests
  app.use(express.json());

  // Status route
  app.get(process.env.API_PREFIX + "/status", (req, res) => {
    res.status(200).send({
      msg: "Alive.",
      version: process.env.VERSION || "Unknown",
      engineIP: process.env.ENGINE_UNIT_IP || undefined,
      thermalIP: process.env.THERMAL_UNIT_IP || undefined,
    });
  });

  //Routes
  app.use(process.env.API_PREFIX + "/units", unitsRoute);
  app.use(process.env.API_PREFIX + "/engine", engineRoute);
  app.use(process.env.API_PREFIX + "/thermal", thermalRoute);

  // Serve Frontend app if running in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(__dirname + "/public/"));

    app.get("/", (req, res) => {
      res.sendFile(__dirname + "/public/index.html");
    });

    open("http://localhost:" + (process.env.PORT || 5000));
  }

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
