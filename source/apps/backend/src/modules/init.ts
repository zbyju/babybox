import { restartRepository } from "./restart";

export function modulesObject() {
  const restartEnabled = process.env.RESTART_ENABLED !== "false";
  const restartRepo = restartRepository();
  return {
    onIncomingData() {
      if (restartEnabled) {
        restartRepo.onIncomingRequest();
      }
    },
  };
}
