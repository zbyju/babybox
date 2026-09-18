import { defineStore } from "pinia";

import {
  rawEngineUnitToEngineUnit,
  rawThermalUnitToThermalUnit,
} from "@/defaults/units.defaults";
import type { Maybe } from "@/types/generic.types";
import type { VoltageConfig } from "@/types/panel/config.types";
import type {
  EngineUnit,
  RawEngineUnit,
  RawThermalUnit,
  ThermalUnit,
} from "@/types/panel/units.types";

import { useConfigStore } from "./configStore";

export const useUnitsStore = defineStore("engineUnit", {
  state: (): {
    engineUnit: Maybe<EngineUnit>;
    thermalUnit: Maybe<ThermalUnit>;
    time: Maybe<number>;
  } => ({
    engineUnit: undefined,
    thermalUnit: undefined,
    time: undefined,
  }),
  getters: {},
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
        this.thermalUnit = undefined;
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
    setTime(time: Maybe<number>) {
      this.time = time;
    },
  },
});
