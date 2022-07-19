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
import { useConfigStore } from "./configStore";
import type { VoltageConfig } from "@/types/panel/config.types";

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
    setRawEngineUnit(rawEngineUnit: Maybe<RawEngineUnit>) {
      if (rawEngineUnit === undefined) {
        this.engineUnit = undefined;
      } else {
        this.engineUnit = rawEngineUnitToEngineUnit(rawEngineUnit);
      }
    },
    setRawThermalUnit(rawThermalUnit: Maybe<RawThermalUnit>) {
      if (rawThermalUnit === undefined) {
        this.engineUnit = undefined;
      } else {
        const config = useConfigStore();
        const voltageConfig: VoltageConfig = config?.units?.voltage
          ? config.units.voltage
          : { divider: 3400, multiplier: 100, addition: 0 };
        this.thermalUnit = rawThermalUnitToThermalUnit(
          rawThermalUnit,
          voltageConfig,
        );
      }
    },
    setTime(time: Maybe<Moment>) {
      this.time = time;
    },
  },
});
