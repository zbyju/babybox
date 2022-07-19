import { defineStore } from "pinia";

import { type AppStateData, AppState } from "@/types/app/appState.types";
import type { Maybe } from "@/types/generic.types";

export const useAppStateStore = defineStore("appState", {
  state: () => ({
    state: AppState.Loading as AppState,
    message: undefined as Maybe<string>,
  }),
  actions: {
    setState(state: AppStateData) {
      this.state = state.state;
      this.message = state.message || undefined;
    },
  },
});
