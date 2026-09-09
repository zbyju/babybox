import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as morgan from "morgan";
import open = require("open");
import { fetchConfig } from "./fetch/fetchConfig";
import { modulesObject } from "./modules/init";
import { router as engineRoute } from "./routes/engineRoute";
import { router as restartRoute } from "./routes/restartRoute";
import { router as thermalRoute } from "./routes/thermalRoute";
import { router as unitsRoute } from "./routes/unitsRoute";
import { MainConfig } from "./types/config.types";
import { wait } from "./utils/wait";

const CONFIG_RETRY_DELAY_MS = 5000;

// modulesObject() reads the RESTART_* vars, so .env has to be loaded before it.
dotenv.config();

export const modules = modulesObject();

export let config: MainConfig | null = null;

async function main() {
  /*
   * The configer service may not be up yet at boot, or may be briefly down.
   * Keep retrying instead of starting with no config,
   * because this backend runs unattended and nobody can restart it on site.
   */
  let c = await fetchConfig();
  let attempt = 1;
  while (!c.data) {
    console.log(
      `Config not available (attempt ${attempt}): ${c.msg} Retrying in ${CONFIG_RETRY_DELAY_MS}ms.`
    );
    await wait(CONFIG_RETRY_DELAY_MS);
    c = await fetchConfig();
    attempt++;
  }
  config = c.data;

  const app = express();
  const port = config?.backend.port || process.env.PORT || 5000;

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
  app.get(process.env.API_PREFIX + "/status", (req, res) => {
    res.status(200).send({
      msg: "Alive.",
    });
  });

  //Routes
  const prefix = config.backend.url || process.env.API_PREFIX;
  app.use(prefix + "/units", unitsRoute);
  app.use(prefix + "/engine", engineRoute);
  app.use(prefix + "/thermal", thermalRoute);
  app.use(prefix + "/restart", restartRoute);

  // Serve Frontend app if running in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(__dirname + "/public/"));

    app.get("/", (req, res) => {
      res.sendFile(__dirname + "/public/index.html");
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
