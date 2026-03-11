import * as express from "express";
import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

import { StreamManager } from "../types/stream.types";

export const router = express.Router();

let manager: StreamManager | null = null;

export function initCameraRoute(streamManager: StreamManager): void {
  manager = streamManager;

  // Serve HLS files (playlist + segments)
  router.use(
    "/stream",
    (req: Request, res: Response, next) => {
      if (req.path.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "no-cache, no-store");
      } else if (req.path.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
        res.setHeader("Cache-Control", "public, max-age=30");
      }
      next();
    },
    express.static(path.resolve(streamManager.getOutputDir()))
  );
}

// Stream status endpoint
router.get("/status", (req: Request, res: Response) => {
  if (!manager) {
    return res.status(200).send({
      enabled: false,
      status: "stopped",
    });
  }

  const state = manager.getState();
  const playlistPath = path.join(manager.getOutputDir(), "stream.m3u8");
  const streamReady = state.status === "running" && fs.existsSync(playlistPath);
  return res.status(200).send({
    enabled: true,
    status: state.status,
    streamReady,
    pid: state.pid,
    lastError: state.lastError,
    startedAt: state.startedAt,
    restartCount: state.restartCount,
  });
});

// Manual restart endpoint
router.post("/restart", (req: Request, res: Response) => {
  if (!manager) {
    return res.status(400).send({ msg: "Stream not configured" });
  }

  manager.restart();
  return res.status(200).send({ msg: "Stream restart initiated" });
});
