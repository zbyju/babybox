import { exec } from "child_process";
import moment from "moment";
import winston from "winston";

import { z } from "../boundary.js";
import type { RestartOs } from "../fetch/readConfig.js";
import { config } from "../index.js";
import type { RestartRepository } from "../types/restart.types.js";
import {
  getFullTimeFormatted,
  getTimeDifferenceInSeconds,
} from "../utils/time.js";

const positiveInteger = z
  .string()
  .regex(/^[0-9]+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const timerInterval = positiveInteger.pipe(z.number().max(2147483647));

const restartCommands = {
  ubuntu: { start: "shutdown -r +1", cancel: "shutdown -c" },
  windows: { start: "shutdown -r -t 60", cancel: "shutdown -a" },
} satisfies Record<
  Extract<RestartOs, { status: "supported" }>["value"],
  {
    start: string;
    cancel: string;
  }
>;

export function restartCommand(
  os: RestartOs | undefined,
  action: "start" | "cancel"
) {
  if (os?.status !== "supported") return undefined;
  return restartCommands[os.value][action];
}

export const restartRepository = function (
  env = process.env,
  schedule: (callback: () => void, ms: number) => unknown = setInterval,
  run: (command: string) => unknown = exec,
  currentOs: () => RestartOs | undefined = () => config?.pc.os
): RestartRepository {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { module: "restart" },
    transports: [new winston.transports.File({ filename: "logs/restart.log" })],
  });

  let pendingCancel: string | undefined;
  let unavailableLogged = false;
  function readSetting(
    key: string,
    schema: z.ZodType<number, z.ZodTypeDef, string>,
    fallback: number
  ) {
    const raw = env[key];
    if (raw === undefined) return fallback;
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    logger.warn(`Invalid ${key}. Using ${fallback}.`);
    return fallback;
  }
  const errorThreshold = readSetting(
    "RESTART_ERROR_THRESHOLD",
    positiveInteger,
    9
  );
  const interval = readSetting("RESTART_INTERVAL", timerInterval, 20000);

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

  schedule(() => {
    if (repo.lastRequest === null) return;

    if (
      getTimeDifferenceInSeconds(repo.lastRequest, moment()) >
      interval / 1000
    ) {
      repo.errorStreak += 1;
    } else {
      repo.errorStreak = 0;
      unavailableLogged = false;
      if (pendingCancel !== undefined) {
        logger.info(`${getFullTimeFormatted()} - Restart stopped`);
        run(pendingCancel);
        pendingCancel = undefined;
      }
    }

    if (repo.errorStreak >= errorThreshold && pendingCancel === undefined) {
      const os = currentOs();
      const start = restartCommand(os, "start");
      const cancel = restartCommand(os, "cancel");
      if (start === undefined || cancel === undefined) {
        if (!unavailableLogged) {
          logger.warn(
            "Automatic restart unavailable for this operating system."
          );
          unavailableLogged = true;
        }
        return;
      }
      logger.info(`${getFullTimeFormatted()} - Starting to restart`);
      run(start);
      pendingCancel = cancel;
    }
  }, interval);

  return repo;
};
