import { defineStore } from "pinia";

import { AppState } from "@/types/app/appState.types";
import type { Maybe } from "@/types/generic.types";

export const useAppStateStore = defineStore("appState", {
  state: () => ({
    state: AppState.Loading as AppState,
    done: [undefined, undefined] as Maybe<boolean>[],
    message: undefined as Maybe<string>,
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
      if (this.done.every((d) => d === true)) {
        setTimeout(() => {
          this.state = AppState.Ok;
        }, 500);
      }
    },
  },
});
