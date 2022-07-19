import { defineStore } from "pinia";

import type { Maybe } from "@/types/generic.types";
import type { AppState } from "@/types/panel/main.types";

export interface AppStateMessage {
  text: string;
  color: string;
  sound?: string;
}

export type AppStateActive = boolean;

export const useAppStateStore = defineStore("appState", {
  state: () => ({
    message: undefined as Maybe<AppStateMessage>,
    active: false as AppStateActive,
  }),
  actions: {
    setState(state: AppState) {
      this.message = state.message;
      this.active = state.active;
    },
  },
});
