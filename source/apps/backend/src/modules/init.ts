import { restartRepository } from "./restart";

const DISABLED_VALUES = ["false", "0", "no", "off"];

/*
 * Accepts every common way of writing "off" because an operator edits .env
 * by hand on site, and a spelling we reject leaves the machine rebooting itself.
 * Unset means enabled.
 */
function isRestartEnabled(): boolean {
  const raw = (process.env.RESTART_ENABLED ?? "").trim().toLowerCase();
  return !DISABLED_VALUES.includes(raw);
}

export function modulesObject() {
  const restartEnabled = isRestartEnabled();
  const restartRepo = restartRepository();
  return {
    onIncomingData() {
      if (restartEnabled) {
        restartRepo.onIncomingRequest();
      }
    },
  };
}
