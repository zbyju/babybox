import { exec } from "child_process";
import moment from "moment";
import winston from "winston";

import { config } from "../index.js";
import type { RestartRepository } from "../types/restart.types.js";
import {
  getFullTimeFormatted,
  getTimeDifferenceInSeconds,
} from "../utils/time.js";

export const restartRepository = function (): RestartRepository {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { module: "restart" },
    transports: [new winston.transports.File({ filename: "logs/restart.log" })],
  });

  let isRestarting = false;
  const errorThreshold =
    parseInt(process.env["RESTART_ERROR_THRESHOLD"] ?? "") || 9;
  const interval: number =
    parseInt(process.env["RESTART_INTERVAL"] ?? "") || 20000;

  /*
   * Callers read lastRequest and errorStreak from this object.
   * The interval writes the same fields, so a read sees the current values.
   */
  const repo: RestartRepository = {
    lastRequest: null,
    errorStreak: 0,
    errorThreshold,
    onIncomingRequest(): void {
      repo.lastRequest = moment();
    },
  };

  function stopRestart() {
    logger.info(`${getFullTimeFormatted()} - Restart stopped`);
    isRestarting = false;
    if (config?.pc.os === "ubuntu") {
      exec("shutdown -c");
    } else {
      exec("shutdown -a");
    }
  }

  function startRestart() {
    logger.info(`${getFullTimeFormatted()} - Starting to restart`);
    isRestarting = true;
    if (config?.pc.os === "ubuntu") {
      exec("shutdown -r -t 60");
    } else {
      exec("shutdown -r +1");
    }
  }

  setInterval(() => {
    if (repo.lastRequest === null) return;

    if (
      getTimeDifferenceInSeconds(repo.lastRequest, moment()) >
      interval / 1000
    ) {
      repo.errorStreak += 1;
    } else {
      repo.errorStreak = 0;
      if (isRestarting) {
        stopRestart();
      }
    }

    if (repo.errorStreak >= errorThreshold && !isRestarting) {
      startRestart();
    }
  }, interval);

  return repo;
};
