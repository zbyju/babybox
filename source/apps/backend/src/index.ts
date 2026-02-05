import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as morgan from "morgan";
import open = require("open");
import { execSync } from "child_process";
import * as path from "path";

import { fetchConfig } from "./fetch/fetchConfig";
import { modulesObject } from "./modules/init";
import { createStreamManager } from "./modules/streamManager";
import { initCameraRoute, router as cameraRoute } from "./routes/cameraRoute";
import { router as engineRoute } from "./routes/engineRoute";
import { router as restartRoute } from "./routes/restartRoute";
import { router as thermalRoute } from "./routes/thermalRoute";
import { router as unitsRoute } from "./routes/unitsRoute";
import { MainConfig } from "./types/config.types";
import { StreamManager } from "./types/stream.types";
import { cameraToRtspUrl } from "./utils/camera";

export const modules = modulesObject();

export let config: MainConfig | null = null;
let streamManager: StreamManager | null = null;

async function main() {
  // .env file load
  dotenv.config();

  const c = await fetchConfig();
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
  app.use(prefix + "/camera", cameraRoute);

  // Video stream setup
  if (config.camera?.video === true) {
    console.log(`Video streaming enabled — cameraType=${config.camera.cameraType} ip=${config.camera.ip}`);
    let ffmpegAvailable = false;
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      ffmpegAvailable = true;
    } catch {
      console.error("ffmpeg not found — video streaming disabled");
    }

    if (ffmpegAvailable) {
      const rtspUrl = cameraToRtspUrl(config.camera);
      if (rtspUrl) {
        const outputDir = path.resolve(__dirname, "streams");
        console.log(`Stream output directory: ${outputDir}`);
        streamManager = createStreamManager(rtspUrl, outputDir);
        initCameraRoute(streamManager);
        streamManager.start();
        console.log(`Video stream started — serving HLS at ${prefix}/camera/stream/stream.m3u8`);
      } else {
        console.error(
          `Unknown camera type "${config.camera.cameraType}" — video streaming disabled`
        );
      }
    }
  } else {
    console.log("Video streaming disabled (camera.video is not true)");
  }

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

function shutdown() {
  if (streamManager) {
    console.log("Shutting down video stream...");
    streamManager.stop();
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main();
