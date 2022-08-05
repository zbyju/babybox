import { Moment } from "moment";
import moment = require("moment");

import { exec } from "child_process";

import { RestartRepository } from "../types/restart.types";
import {
  getFullTimeFormatted,
  getTimeDifferenceInSeconds,
} from "../utils/time";
import winston = require("winston");

export const restartRepository = function (): RestartRepository {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { module: "restart" },
    transports: [new winston.transports.File({ filename: "logs/restart.log" })],
  });

  let lastRequest = null as Moment;
  let errorStreak = 0;
  let isRestarting = false;
  const errorThreshold = parseInt(process.env.RESTART_ERROR_THRESHOLD) || 10;
  const interval: number = parseInt(process.env.RESTART_INTEVAL) || 5000;

  function onIncomingRequest(): void {
    lastRequest = moment();
  }

  function stopRestart() {
    logger.info(`${getFullTimeFormatted()} - Restart stopped`);
    isRestarting = false;
    exec("shutdown -a");
  }

  function startRestart() {
    logger.info(`${getFullTimeFormatted()} - Starting to restart`);
    isRestarting = true;
    exec("shutdown -r -t 60");
  }

  setInterval(() => {
    if (lastRequest === null) return;

    if (getTimeDifferenceInSeconds(lastRequest, moment()) > interval / 1000) {
      errorStreak += 1;
    } else {
      errorStreak = 0;
      if (isRestarting) {
        stopRestart();
      }
    }

    if (errorStreak >= errorThreshold && !isRestarting) {
      startRestart();
    }
  }, interval);

  return {
    lastRequest,
    errorStreak,
    errorThreshold,

    onIncomingRequest,
  };
};
