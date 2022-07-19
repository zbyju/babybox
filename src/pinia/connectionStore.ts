import type { Connection } from "@/types/panel/connection.types";
import { ConnectionResult, ConnectionTracker } from "@/logic/panel/connections";
import { defineStore } from "pinia";

export const useConnectionStore = defineStore("connection", {
  state: (): Connection => ({
    engineUnit: new ConnectionTracker() as ConnectionTracker,
    thermalUnit: new ConnectionTracker() as ConnectionTracker,
  }),
  getters: {
    connection: (state): Connection => ({
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
