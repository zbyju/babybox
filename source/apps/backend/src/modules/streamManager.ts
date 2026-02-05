import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import winston = require("winston");

import { StreamManager, StreamState, StreamStatus } from "../types/stream.types";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { module: "stream" },
  transports: [new winston.transports.File({ filename: "logs/stream.log" })],
});

const MIN_RESTART_DELAY = 5000;
const MAX_RESTART_DELAY = 60000;
const SIGKILL_TIMEOUT = 3000;
const M3U8_CHECK_INTERVAL = 1000;

export function createStreamManager(
  rtspUrl: string,
  outputDir: string
): StreamManager {
  let process: ChildProcess | null = null;
  let status: StreamStatus = "stopped";
  let pid: number | null = null;
  let lastError: string | null = null;
  let startedAt: Date | null = null;
  let restartCount = 0;
  let restartTimer: NodeJS.Timeout | null = null;
  let m3u8CheckTimer: NodeJS.Timeout | null = null;
  let stopping = false;

  function cleanOutputDir(): void {
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    } else {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  function startM3u8Check(): void {
    const playlistPath = path.join(outputDir, "stream.m3u8");
    m3u8CheckTimer = setInterval(() => {
      if (status === "starting" && fs.existsSync(playlistPath)) {
        status = "running";
        logger.info("Stream is running — playlist file detected");
        clearM3u8Check();
      }
    }, M3U8_CHECK_INTERVAL);
  }

  function clearM3u8Check(): void {
    if (m3u8CheckTimer) {
      clearInterval(m3u8CheckTimer);
      m3u8CheckTimer = null;
    }
  }

  function clearRestartTimer(): void {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart(): void {
    if (stopping) return;
    const delay = Math.min(
      MIN_RESTART_DELAY * Math.pow(2, restartCount),
      MAX_RESTART_DELAY
    );
    logger.info(`Scheduling restart in ${delay}ms (attempt ${restartCount + 1})`);
    restartTimer = setTimeout(() => {
      restartCount++;
      start();
    }, delay);
  }

  function start(): void {
    if (status === "running" || status === "starting") return;

    stopping = false;
    cleanOutputDir();

    const segmentPattern = path.join(outputDir, "segment_%03d.ts");
    const playlistPath = path.join(outputDir, "stream.m3u8");

    const args = [
      "-rtsp_transport", "tcp",
      "-stimeout", "5000000",
      "-i", rtspUrl,
      "-c:v", "copy",
      "-an",
      "-f", "hls",
      "-hls_time", "2",
      "-hls_list_size", "5",
      "-hls_flags", "delete_segments+append_list",
      "-hls_segment_filename", segmentPattern,
      playlistPath,
    ];

    status = "starting";
    logger.info(`Starting ffmpeg stream — rtsp=${rtspUrl} outputDir=${outputDir} playlist=${playlistPath}`);

    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    process = child;
    pid = child.pid ?? null;
    startedAt = new Date();

    child.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        logger.warn(`ffmpeg: ${msg}`);
      }
    });

    child.on("error", (err) => {
      logger.error(`ffmpeg process error: ${err.message}`);
      lastError = err.message;
      status = "error";
      pid = null;
      process = null;
      clearM3u8Check();
      scheduleRestart();
    });

    child.on("close", (code) => {
      clearM3u8Check();
      if (stopping) {
        status = "stopped";
        pid = null;
        process = null;
        logger.info("ffmpeg stopped gracefully");
        return;
      }
      logger.warn(`ffmpeg exited with code ${code}`);
      lastError = `ffmpeg exited with code ${code}`;
      status = "error";
      pid = null;
      process = null;
      scheduleRestart();
    });

    startM3u8Check();
  }

  function stop(): void {
    stopping = true;
    clearRestartTimer();
    clearM3u8Check();

    if (!process) {
      status = "stopped";
      return;
    }

    logger.info("Stopping ffmpeg stream");
    process.kill("SIGTERM");

    const killTimer = setTimeout(() => {
      if (process) {
        logger.warn("ffmpeg did not exit after SIGTERM, sending SIGKILL");
        process.kill("SIGKILL");
      }
    }, SIGKILL_TIMEOUT);

    process.on("close", () => {
      clearTimeout(killTimer);
    });
  }

  function restart(): void {
    restartCount = 0;
    stop();
    // Wait a tick for the process to clean up before restarting
    setTimeout(() => {
      start();
    }, 500);
  }

  function getState(): StreamState {
    return {
      status,
      pid,
      lastError,
      startedAt,
      restartCount,
    };
  }

  function getOutputDir(): string {
    return outputDir;
  }

  return { start, stop, restart, getState, getOutputDir };
}
