import type {
  EngineUnit,
  ThermalUnit,
  RawEngineUnit,
  RawThermalUnit,
} from "@/types/panel/units.types";
import type { Moment } from "moment";
import { defineStore } from "pinia";
import {
  rawEngineUnitToEngineUnit,
  rawThermalUnitToThermalUnit,
} from "@/defaults/units.defaults";
import type { Maybe } from "@/types/generic.types";

export const useUnitsStore = defineStore("engineUnit", {
  state: () => ({
    engineUnit: undefined as Maybe<EngineUnit>,
    thermalUnit: undefined as Maybe<ThermalUnit>,
    time: undefined as Maybe<Moment>,
  }),
  getters: {}, // TODO: Add used getters
  actions: {
    setEngineUnit(engineUnit: EngineUnit) {
      this.engineUnit = engineUnit;
    },
    setThermalUnit(thermalUnit: ThermalUnit) {
      this.thermalUnit = thermalUnit;
    },
    setRawEngineUnit(rawEngineUnit: RawEngineUnit) {
      this.engineUnit = rawEngineUnitToEngineUnit(rawEngineUnit);
    },
    setRawThermalUnit(rawThermalUnit: RawThermalUnit) {
      this.thermalUnit = rawThermalUnitToThermalUnit(rawThermalUnit);
    },
    setTime(time: Maybe<Moment>) {
      this.time = time;
    },
  },
});
