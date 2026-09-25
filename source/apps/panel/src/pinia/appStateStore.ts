import { defineStore } from "pinia";

import { AppState } from "@/types/app/appState.types";
import type { Maybe } from "@/types/generic.types";

interface AppStateState {
  state: AppState;
  done: Maybe<boolean>[];
  message: Maybe<string>;
  startedAt: number;
  okScheduled: boolean;
}

export const useAppStateStore = defineStore("appState", {
  state: (): AppStateState => ({
    state: AppState.Loading,
    done: [undefined, undefined],
    message: undefined,
    /*
     * performance.now() is monotonic, unlike Date.now().
     * These panels run for months, so an NTP step backwards must not stall the boot screen.
     */
    startedAt: performance.now(),
    okScheduled: false,
  }),
  actions: {
    setConfigSuccess() {
      this.setConfig(true);
    },
    setConfigError() {
      this.setConfig(false);
    },
    setConfig(success: boolean) {
      this.done[0] = success;
      if (!success) {
        this.state = AppState.Error;
      }
      this.checkState();
    },
    setBackendSuccess() {
      this.setBackend(true);
    },
    setBackendError() {
      this.setBackend(false);
    },
    setBackend(success: boolean) {
      this.done[1] = success;
      if (!success) {
        this.state = AppState.Trying;
      }
      this.checkState();
    },
    checkState() {
      if (this.okScheduled || !this.done.every((d) => d === true)) {
        return;
      }
      this.okScheduled = true;

      // Show the boot screen for at least a second so it does not flash by.
      const MIN_BOOT_SCREEN_MS = 1000;
      const remaining = Math.max(
        0,
        MIN_BOOT_SCREEN_MS - (performance.now() - this.startedAt),
      );
      setTimeout(() => {
        this.state = AppState.Ok;
      }, remaining);
    },
  },
});
