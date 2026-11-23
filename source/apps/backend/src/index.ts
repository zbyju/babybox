import { bindingPort, z } from "./boundary.js";
import { readConfig } from "./fetch/readConfig.js";
import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import open from "open";
import * as path from "path";
import { fileURLToPath } from "url";

import { EmailRelay } from "./email/relay.js";
import { repairListenerPermission } from "./email/listenerRepair.js";
import { object } from "./email/settings.js";
import { fetchConfig } from "./fetch/fetchConfig.js";
import { jsonErrors } from "./middleware/jsonErrors.js";
import type {
  BackendReadableConfig,
  BoundAddress,
} from "./modules/configReload.js";
import { modulesObject } from "./modules/init.js";
import { router as engineRoute } from "./routes/engineRoute.js";
import { router as reloadRoute } from "./routes/reloadRoute.js";
import { router as restartRoute } from "./routes/restartRoute.js";
import { router as thermalRoute } from "./routes/thermalRoute.js";
import { router as unitsRoute } from "./routes/unitsRoute.js";
import { safeRoutePrefix } from "./utils/routePrefix.js";
import {
  cachedRuntimeVersions,
  startupLastFor,
  statusBody,
} from "./utils/runtimeVersions.js";
import { wait } from "./utils/wait.js";

const CONFIG_RETRY_DELAY_MS = 5000;
const emailIds = z.array(z.string()).max(100);

/*
 * Not import.meta.dirname: that needs Node 20.11.
 * The box's Node 18 starts this dist when Bun is missing.
 */
const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(APP_DIR, "public");
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
// quiet: 18 prints the loaded file on stderr, which fails a box build.
dotenv.config({ quiet: true });

export const modules = modulesObject();

export let config: BackendReadableConfig | null = null;

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
export function applyConfig(next: BackendReadableConfig): void {
  config = next;
}

async function main() {
  /*
   * The configer service may not be up yet at boot, or may be briefly down.
   * Keep retrying instead of starting with no config,
   * because this backend runs unattended and nobody can restart it on site.
   */
  let answer = await readConfig(fetchConfig);
  let attempt = 1;
  while (answer.status === "failed") {
    console.log(
      `Config not available (attempt ${attempt}): ${answer.msg} Retrying in ${CONFIG_RETRY_DELAY_MS}ms.`
    );
    await wait(CONFIG_RETRY_DELAY_MS);
    answer = await readConfig(fetchConfig);
    attempt++;
  }
  const loaded = answer.config;
  applyConfig(loaded);

  const app = express();
  app.set("query parser", "extended");
  const port = bindingPort(loaded.backend.port, process.env["PORT"], 5000);

  // Setup logger - morgan
  if (process.env["NODE_ENV"] === "development") {
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

  const rawPrefix = loaded.backend.url || process.env["API_PREFIX"] || "";
  const prefix = safeRoutePrefix(rawPrefix);
  if (prefix !== rawPrefix) {
    console.error(
      `API prefix ${rawPrefix} is not a valid route, serving without one.`
    );
  }

  // Status route
  app.get(prefix + "/status", (req, res) => {
    res
      .status(200)
      .send(statusBody(cachedRuntimeVersions(), startupLastFor(APP_DIR)));
  });

  //Routes
  app.use(prefix + "/units", unitsRoute);
  app.use(prefix + "/engine", engineRoute);
  app.use(prefix + "/thermal", thermalRoute);
  app.use(prefix + "/restart", restartRoute);
  app.use(prefix + "/reload", reloadRoute);

  const email = new EmailRelay(() => config);
  let listenerRepairPendingRestart = false;
  let listenerRepairInProgress = false;
  app.get(prefix + "/email", (_req, res) => res.send(email.status()));
  app.post(prefix + "/email/:action", async (req, res) => {
    try {
      const action = req.params["action"];
      if (typeof action !== "string") {
        res.sendStatus(404);
        return;
      }
      const body: unknown = req.body;
      const fields = object(body) ? body : {};
      if (action === "check-smtp") {
        res.send(await email.checkOutbound());
        return;
      }
      if (action === "recheck-listener") {
        email.recheckListener();
        res.send({ msg: "Panel znovu zkontroluje příjem SMTP." });
        return;
      }
      if (
        action === "repair-listener" ||
        action === "restart-after-listener-repair"
      ) {
        const localOrigin = `http://localhost:${port}`;
        const peer = req.socket.remoteAddress;
        if (
          !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer ?? "") ||
          req.get("host") !== `localhost:${port}` ||
          req.get("origin") !== localOrigin ||
          !req.is("application/json")
        ) {
          res
            .status(403)
            .send({ msg: "Opravu spusťte přímo na počítači panelu." });
          return;
        }
        if (action === "restart-after-listener-repair") {
          if (
            !listenerRepairPendingRestart ||
            process.env["pm_id"] === undefined ||
            email.status().queue.length
          ) {
            res
              .status(409)
              .send({
                msg: "Panel nyní nelze bezpečně restartovat. Zkontrolujte frontu nebo použijte běžný restart panelu.",
              });
            return;
          }
          listenerRepairPendingRestart = false;
          res.once("finish", () => setTimeout(() => process.exit(0), 250));
          res.send({ msg: "Panel se restartuje a znovu zkontroluje port 25." });
          return;
        }
        if (listenerRepairInProgress || !email.status().canRepairListener) {
          res
            .status(409)
            .send({ msg: "Oprávnění příjmu SMTP nyní nelze opravit." });
          return;
        }
        listenerRepairInProgress = true;
        try {
          await repairListenerPermission();
          listenerRepairPendingRestart = true;
          res.send({
            msg: "Oprávnění bylo nastaveno. Restartujte panel, aby ho mohl použít.",
            restartAvailable: process.env["pm_id"] !== undefined,
          });
        } catch {
          res.status(409).send({
            msg: "Oprávnění se nepodařilo nastavit. Zkontrolujte schválení správcem a dostupnost pkexec a setcap.",
          });
        } finally {
          listenerRepairInProgress = false;
        }
        return;
      }
      if (action === "test") {
        const recipient = fields["recipient"];
        const id = await email.test(
          typeof recipient === "string" ? recipient : ""
        );
        res.send({
          id,
          msg: "Test zařazen do fronty. Sledujte výsledek v historii.",
        });
        return;
      }
      if (action !== "retry" && action !== "delete" && action !== "clear") {
        res.status(404).send({ msg: "Neznámá akce." });
        return;
      }
      if (action !== "retry" && fields["confirmed"] !== true) {
        res.status(400).send({ msg: "Odstranění vyžaduje potvrzení." });
        return;
      }
      const ids = emailIds.safeParse(action === "clear" ? [] : fields["ids"]);
      if (!ids.success) {
        res.status(400).send({ msg: "Neplatný výběr zpráv." });
        return;
      }
      const changed = await email.action(action, ids.data);
      res.send({
        changed,
        msg: `Změněno zpráv: ${changed}. Aktivní odesílání se dokončí.`,
      });
    } catch {
      res.status(400).send({
        msg: "Akci nelze provést. Zkontrolujte nastavení e-mailu a stav služby.",
      });
    }
  });

  // Serve Frontend app if running in production
  if (process.env["NODE_ENV"] === "production") {
    app.use(express.static(PUBLIC_DIR, { setHeaders: setPanelCacheHeaders }));

    app.get("/", (req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, "index.html"), {
        headers: { "Cache-Control": INDEX_CACHE_CONTROL },
      });
    });

    /*
     * The panel is a history-mode SPA, so /config is a real URL. A hard load of it
     * asks this server for that path, and without this the answer is
     * "Cannot GET /config". The save path ends in window.location.reload(), so the
     * config page could not come back up. Registered after the API routes and after
     * express.static, so it only sees what nothing else matched.
     * Express 5 rejects a bare "*": path-to-regexp 8 wants a named splat.
     */
    app.get("/{*splat}", (req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, "index.html"), {
        headers: { "Cache-Control": INDEX_CACHE_CONTROL },
      });
    });

    /*
     * A browser that will not open is not a reason to stop serving. Without
     * the catch the rejected promise ends the process on Node 15 and newer.
     */
    open("http://localhost:" + port).catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
    });
  }

  // Last, so it sees what every route above threw.
  app.use(jsonErrors);

  bound = { port, prefix };

  app.listen(port, () => {
    const color =
      process.env["NODE_ENV"] === "production" ? "\x1b[32m" : "\x1b[35m";

    console.log(
      `Babybox backend running in ${color}\x1b[1m%s\x1b[0m and listening on port \x1b[1m%s`,
      process.env["NODE_ENV"],
      port
    );
  });
  // Email initialization is deliberately outside the monitoring startup path.
  void email
    .start()
    .catch(() =>
      console.error("E-mailovou službu nelze spustit. Sledování pokračuje.")
    );
}

void main();
