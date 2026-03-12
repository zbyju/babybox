import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import winston = require("winston");

import { StreamManager, StreamState, StreamStatus } from "../types/stream.types";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [stream] ${level}: ${message}`;
    })
  ),
  defaultMeta: { module: "stream" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/stream.log" }),
  ],
});

const MIN_RESTART_DELAY = 5000;
const MAX_RESTART_DELAY = 120000;
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

  logger.info(`Stream manager created — rtspUrl=${rtspUrl} outputDir=${outputDir}`);

  function cleanOutputDir(): void {
    logger.info(`Cleaning output directory: ${outputDir}`);
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      logger.info(`Removing ${files.length} existing file(s) from output directory`);
      for (const file of files) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    } else {
      logger.info(`Output directory does not exist, creating: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  function startM3u8Check(): void {
    const playlistPath = path.join(outputDir, "stream.m3u8");
    logger.info(`Waiting for playlist file: ${playlistPath}`);
    m3u8CheckTimer = setInterval(() => {
      if (status === "starting" && fs.existsSync(playlistPath)) {
        status = "running";
        restartCount = 0;
        logger.info("Stream is running — playlist file detected, restart count reset");
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
    if (stopping) {
      logger.info("Not scheduling restart — stop was requested");
      return;
    }
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
    if (status === "running" || status === "starting") {
      logger.info(`Start called but status is already "${status}" — skipping`);
      return;
    }

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
    logger.info(`Starting ffmpeg with command: ffmpeg ${args.join(" ")}`);

    let child: ChildProcess;
    try {
      child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to spawn ffmpeg process: ${msg}`);
      lastError = msg;
      status = "error";
      scheduleRestart();
      return;
    }

    process = child;
    pid = child.pid ?? null;
    startedAt = new Date();

    if (pid) {
      logger.info(`ffmpeg process spawned with PID ${pid}`);
    } else {
      logger.warn("ffmpeg process spawned but PID is unavailable");
    }

    child.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        logger.info(`ffmpeg stdout: ${msg}`);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        logger.warn(`ffmpeg stderr: ${msg}`);
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

    child.on("close", (code, signal) => {
      clearM3u8Check();
      if (stopping) {
        status = "stopped";
        pid = null;
        process = null;
        logger.info("ffmpeg stopped gracefully");
        return;
      }
      logger.warn(`ffmpeg exited with code=${code} signal=${signal}`);
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
      logger.info("Stop called but no process is running");
      status = "stopped";
      return;
    }

    logger.info("Stopping ffmpeg stream (sending SIGTERM)");
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
    logger.info("Manual restart requested — resetting restart count");
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
