import {
  DefaultEngineUnit,
  DefaultThermalUnit,
} from "@/types/panel/units-data";
import moment from "moment";
import { defineStore } from "pinia";

export type UnitVariable = {
  index: number;
  value: string;
  label?: string;
};

export type EngineUnit = Array<UnitVariable>;
export type ThermalUnit = Array<UnitVariable>;

export const useUnitsStore = defineStore("engineUnit", {
  state: () => ({
    engineUnit: DefaultEngineUnit as EngineUnit,
    thermalUnit: DefaultThermalUnit as ThermalUnit,
    time: null as moment.Moment,
  }),
  getters: {}, // TODO: Add used getters
  actions: {
    setEngineUnit(engineUnit: EngineUnit) {
      this.engineUnit = engineUnit;
    },
    setThermalUnit(thermalUnit: ThermalUnit) {
      this.thermalUnit = thermalUnit;
    },
    setTime(time: moment.Moment) {
      this.time = time;
    },
  },
});
