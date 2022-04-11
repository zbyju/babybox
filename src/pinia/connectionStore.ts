import { ConnectionTracker } from "@/utils/panel/connections";
import { defineStore } from "pinia";

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    engineUnit: new ConnectionTracker(),
    thermalUnit: new ConnectionTracker(),
  }),
  actions: {},
});
