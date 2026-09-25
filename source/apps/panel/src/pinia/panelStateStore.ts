import { defineStore } from "pinia";

import type { PanelState } from "@/types/panel/main.types";

export const usePanelStateStore = defineStore("panelState", {
  state: (): PanelState => ({
    message: undefined,
    active: false,
  }),
  actions: {
    setState(state: PanelState) {
      this.message = state.message;
      this.active = state.active;
    },
  },
});
