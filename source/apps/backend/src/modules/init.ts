import { restartRepository } from "./restart";

export function modulesObject() {
  const restartEnabled = process.env.RESTART_ENABLED || true;
  const restartRepo = restartRepository();
  return {
    onIncomingData() {
      if (restartEnabled) {
        restartRepo.onIncomingRequest();
      }
    },
  };
}
