import { Connection } from "@/types/panel/connection";
import { ConnectionTracker } from "@/utils/panel/connections";
import { defineStore } from "pinia";

export const useConnectionStore = defineStore("connection", {
  state: (): Connection => ({
    engineUnit: new ConnectionTracker() as ConnectionTracker,
    thermalUnit: new ConnectionTracker() as ConnectionTracker,
  }),
  getters: {
    connection: (state) => ({
      engineUnit: state.engineUnit,
      thermalUnit: state.thermalUnit,
    }),
  },
  actions: {},
});
