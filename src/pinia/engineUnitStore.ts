import { DefaultEngineUnit, EngineUnit } from "@/types/panel/units-data";
import { defineStore } from "pinia";

export const useStore = defineStore("engineUnit", {
  state: () => DefaultEngineUnit as EngineUnit,
  getters: {}, // TODO: Add used getters
  actions: {},
});
