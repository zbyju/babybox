import { defineStore } from "pinia";

export interface AppStateMessage {
  text: string;
  color: string;
  sound?: string;
}

export type AppStateActive = boolean;

export const useAppStateStore = defineStore("appState", {
  state: () => ({
    message: null as AppStateMessage,
    active: false as AppStateActive,
  }),
  actions: {},
});
