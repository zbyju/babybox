import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import open from "open";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { modulesObject } from "./modules/init.js";
import { configRoute } from "./routes/configRoute.js";
import { router as engineRoute } from "./routes/engineRoute.js";
import { router as healthRoute } from "./routes/healthRoute.js";
import { router as restartRoute } from "./routes/restartRoute.js";
import { router as thermalRoute } from "./routes/thermalRoute.js";
import { router as unitsRoute } from "./routes/unitsRoute.js";
import { loadConfig } from "./services/config/loader.js";
import { setConfig, getConfig } from "./state/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const modules = modulesObject();

async function main() {
  // .env file load
  dotenv.config();

  const config = await loadConfig();
  setConfig(config);

  const app = express();
  const port = config.backend.port || process.env.PORT || 3000;

  // Setup logger - morgan
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // Allow cors
  app.use(
    cors({
      maxAge: 60 * 60 * 24 * 7,
    })
  );

  // Parse JSON in POST requests
  app.use(express.json());

  // Status route
  const startedAt = Date.now();
  app.get(process.env.API_PREFIX + "/status", (req, res) => {
    res.status(200).json({
      msg: "Alive.",
      uptimeMs: Date.now() - startedAt,
      environment: process.env.NODE_ENV ?? "unknown",
    });
  });

  //Routes
  const prefix = config.backend.url || process.env.API_PREFIX;
  app.use(prefix + "/config", configRoute);
  app.use(prefix + "/units", unitsRoute);
  app.use(prefix + "/engine", engineRoute);
  app.use(prefix + "/thermal", thermalRoute);
  app.use(prefix + "/restart", restartRoute);
  app.use(prefix + "/health", healthRoute);

  // Serve Frontend app if running in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(join(__dirname, "public")));

    app.get("/", (req, res) => {
      res.sendFile(join(__dirname, "public", "index.html"));
    });

    open("http://localhost:" + port);
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
