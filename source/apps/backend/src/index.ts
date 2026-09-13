import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as morgan from "morgan";
import * as path from "path";
import open = require("open");
import { fetchConfig } from "./fetch/fetchConfig";
import type { BoundAddress } from "./modules/configReload";
import { modulesObject } from "./modules/init";
import { router as engineRoute } from "./routes/engineRoute";
import { router as reloadRoute } from "./routes/reloadRoute";
import { router as restartRoute } from "./routes/restartRoute";
import { router as thermalRoute } from "./routes/thermalRoute";
import { router as unitsRoute } from "./routes/unitsRoute";
import type { MainConfig } from "./types/config.types";
import { wait } from "./utils/wait";

const CONFIG_RETRY_DELAY_MS = 5000;

const PUBLIC_DIR = path.join(__dirname, "public");
const HASHED_ASSETS_DIR = path.join(PUBLIC_DIR, "assets");

/* Revalidate on every load, so a deployed update is picked up right away. */
const INDEX_CACHE_CONTROL = "no-cache";

/*
 * Vite puts a content hash in these file names,
 * so a changed file always arrives under a new URL.
 */
const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/*
 * Sounds, fonts, the favicon and styles.json keep the same name across deploys,
 * so the cache lifetime is how long we accept serving an old copy.
 * One day skips the re-download on the panel's periodic reloads
 * but still refreshes the alert sounds without anyone going on site.
 */
const STABLE_NAME_CACHE_CONTROL = "public, max-age=86400";

function setPanelCacheHeaders(res: express.Response, filePath: string) {
  if (path.basename(filePath) === "index.html") {
    res.setHeader("Cache-Control", INDEX_CACHE_CONTROL);
  } else if (filePath.startsWith(HASHED_ASSETS_DIR + path.sep)) {
    res.setHeader("Cache-Control", HASHED_ASSET_CACHE_CONTROL);
  } else {
    res.setHeader("Cache-Control", STABLE_NAME_CACHE_CONTROL);
  }
}

// modulesObject() reads the RESTART_* vars, so .env has to be loaded before it.
dotenv.config();

export const modules = modulesObject();

export let config: MainConfig | null = null;

/*
 * What the server is really listening on, set when it starts listening. Null until
 * then. POST /reload compares the stored values against this and not against
 * `config.backend`, which it overwrites a line later.
 */
export let bound: BoundAddress | null = null;

/*
 * The one writer of `config`, so POST /reload can swap it in without a second copy
 * of the binding. Consumers read `config.x` inside their functions, so the new
 * value reaches them on their next call.
 */
export function applyConfig(next: MainConfig): void {
  config = next;
}

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

  const prefix = config.backend.url || process.env.API_PREFIX;

  // Status route
  app.get(prefix + "/status", (req, res) => {
    res.status(200).send({
      msg: "Alive.",
    });
  });

  //Routes
  app.use(prefix + "/units", unitsRoute);
  app.use(prefix + "/engine", engineRoute);
  app.use(prefix + "/thermal", thermalRoute);
  app.use(prefix + "/restart", restartRoute);
  app.use(prefix + "/reload", reloadRoute);

  // Serve Frontend app if running in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(PUBLIC_DIR, { setHeaders: setPanelCacheHeaders }));

    app.get("/", (req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, "index.html"), {
        headers: { "Cache-Control": INDEX_CACHE_CONTROL },
      });
    });

    open("http://localhost:" + port);
  }

  bound = { port, prefix: prefix ?? "" };

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
