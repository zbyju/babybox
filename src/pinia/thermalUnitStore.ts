import { DefaultThermalUnit, ThermalUnit } from "@/types/panel/units-data";
import { defineStore } from "pinia";

export const useStore = defineStore("thermalUnit", {
  state: () => DefaultThermalUnit as ThermalUnit,
  getters: {}, // TODO: Add used getters
  actions: {},
});
