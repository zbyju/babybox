import type { Moment } from "moment";

import type { Maybe } from "../generic.types";

export type RawUnitVariable = {
  index: number;
  value: string;
  label?: string;
};

export type RawEngineUnit = RawUnitVariable[];
export type RawThermalUnit = RawUnitVariable[];

export type UnitValue<T> = Maybe<T>;

export interface ThermalUnit {
  data: {
    temperature: {
      inner: UnitValue<number>;
      outside: UnitValue<number>;
      casing: UnitValue<number>;
      top: UnitValue<number>;
      bottom: UnitValue<number>;

      isHeatingCasing: UnitValue<boolean>;
      isHeatingAir: UnitValue<boolean>;
      isCoolingAir: UnitValue<boolean>;
    };
    voltage: {
      in: UnitValue<number>;
      battery: UnitValue<number>;
      units: UnitValue<number>;
      gsm: UnitValue<number>;
    };
    door: {
      isServiceDoorOpened: UnitValue<boolean>;
    };

    time: UnitValue<Moment>;

    isBlocked: UnitValue<boolean>;
    blockValue: UnitValue<number>;
  };
  settings: {
    temperature: {
      hysteresisHeating: UnitValue<number>;
      hysteresisCooling: UnitValue<number>;
      optimalInner: UnitValue<number>;
      minimalInner: UnitValue<number>;
      maximalInner: UnitValue<number>;
      maximalCasing: UnitValue<number>;
      maximalPeltier: UnitValue<number>;
    };
    voltage: {
      minimal: UnitValue<number>;
    };
    misc: {
      emailPeriodInSeconds: UnitValue<number>;
    };
  };
}

export interface EngineUnit {
  data: {
    temperature: {
      inner: UnitValue<number>;
    };
    engine: {
      left: {
        load: UnitValue<number>;
        position: UnitValue<number>;
      };
      right: {
        load: UnitValue<number>;
        position: UnitValue<number>;
      };
    };
    door: {
      state: UnitValue<number>;

      isBarrierInterrupted: UnitValue<boolean>;
      isServiceDoorOpened: UnitValue<boolean>;
    };
    timers: {
      inspectionMessage: UnitValue<number>;
      serviceDoor: UnitValue<number>;
    };
    misc: {
      inspectionNotDoneForDays: UnitValue<number>;
    };
    time: UnitValue<Moment>;
    isBlocked: UnitValue<boolean>;
    blockValue: UnitValue<number>;
  };
  settings: {
    temperature: {
      minimalInner: UnitValue<number>;
      maximalInner: UnitValue<number>;
    };
    engine: {
      allowedLoad: UnitValue<number>;
      timeForEngineStart: UnitValue<number>;

      closedThreshold: UnitValue<number>;
      openedThreshold: UnitValue<number>;
      timeToBeOpenedInSeconds: UnitValue<number>;
    };
    misc: {
      pcTimeoutConnection: UnitValue<number>;

      emailPeriodInSeconds: UnitValue<number>;
      criticalEmailPeriodInSeconds: UnitValue<number>;

      inspectionPeriodInSeconds: UnitValue<number>;
    };
  };
}
