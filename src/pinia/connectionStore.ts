import type { Connection } from "@/types/panel/connection";
import { ConnectionResult, ConnectionTracker } from "@/utils/panel/connections";
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
  actions: {
    incrementSuccessEngine() {
      this.engineUnit.addResult(ConnectionResult.Success);
    },
    incrementFailEngine() {
      this.engineUnit.addResult(ConnectionResult.Fail);
    },
    incrementSuccessThermal() {
      this.thermalUnit.addResult(ConnectionResult.Success);
    },
    incrementFailThermal() {
      this.thermalUnit.addResult(ConnectionResult.Fail);
    },
  },
});
