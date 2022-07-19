import { defineStore } from "pinia";

import type { Maybe } from "@/types/generic.types";
import type { Message, PanelState } from "@/types/panel/main.types";

export const usePanelStateStore = defineStore("panelState", {
  state: () => ({
    message: undefined as Maybe<Message>,
    active: false as boolean,
  }),
  actions: {
    setState(state: PanelState) {
      this.message = state.message;
      this.active = state.active;
    },
  },
});
