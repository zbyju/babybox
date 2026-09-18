import { defineStore } from "pinia";

import {
  applyConnectionResult,
  ConnectionResult,
  createConnectionStats,
} from "@/logic/panel/connections";
import type { Connection } from "@/types/panel/connection.types";

export const useConnectionStore = defineStore("connection", {
  state: (): Connection => ({
    engineUnit: createConnectionStats(),
    thermalUnit: createConnectionStats(),
  }),
  getters: {
    connection: (state): Connection => ({
      engineUnit: state.engineUnit,
      thermalUnit: state.thermalUnit,
    }),
  },
  actions: {
    incrementSuccessEngine() {
      applyConnectionResult(this.engineUnit, ConnectionResult.Success);
    },
    incrementFailEngine() {
      applyConnectionResult(this.engineUnit, ConnectionResult.Fail);
    },
    incrementSuccessThermal() {
      applyConnectionResult(this.thermalUnit, ConnectionResult.Success);
    },
    incrementFailThermal() {
      applyConnectionResult(this.thermalUnit, ConnectionResult.Fail);
    },
  },
});
