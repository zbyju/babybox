import type { VoltageConfig } from "@/types/panel/config.types";
import type {
  EngineUnit,
  RawEngineUnit,
  RawThermalUnit,
  RawUnitVariable,
  ThermalUnit,
} from "@/types/panel/units.types";
import {
  partitionedTimeToMoment,
  stringBooleanToBoolean,
  stringToNumber,
  stringToNumberWithDecimals,
  stringToVoltage,
} from "@/utils/panel/conversions";

/*
 * Throws on a short answer, as reading `.value` of a missing entry did.
 * The panel loop catches it and counts a failed request.
 */
const valueAt = (raw: RawUnitVariable[], index: number): string => {
  const variable = raw[index];
  if (variable === undefined) {
    throw new Error(`The unit answer has no value at index ${index}.`);
  }
  return variable.value;
};

export const rawEngineUnitToEngineUnit = (
  rawEngineUnit: RawEngineUnit,
): EngineUnit => {
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(valueAt(rawEngineUnit, 28)),
      },
      engine: {
        left: {
          load: stringToNumber(valueAt(rawEngineUnit, 35)),
          position: stringToNumber(valueAt(rawEngineUnit, 37)),
        },
        right: {
          load: stringToNumber(valueAt(rawEngineUnit, 36)),
          position: stringToNumber(valueAt(rawEngineUnit, 38)),
        },
      },
      door: {
        state: stringToNumber(valueAt(rawEngineUnit, 48)),

        isBarrierInterrupted: stringBooleanToBoolean(
          valueAt(rawEngineUnit, 17),
        ),
        isServiceDoorOpened: stringBooleanToBoolean(valueAt(rawEngineUnit, 23)),
      },
      timers: {
        inspectionMessage: stringToNumber(valueAt(rawEngineUnit, 59)),
        serviceDoor: stringToNumber(valueAt(rawEngineUnit, 58)),
      },
      misc: {
        inspectionNotDoneForDays: stringToNumber(valueAt(rawEngineUnit, 33)),
      },
      time: partitionedTimeToMoment(
        valueAt(rawEngineUnit, 39),
        valueAt(rawEngineUnit, 40),
        valueAt(rawEngineUnit, 41),
        valueAt(rawEngineUnit, 42),
        valueAt(rawEngineUnit, 43),
        valueAt(rawEngineUnit, 44),
      ),
      isBlocked: stringBooleanToBoolean(valueAt(rawEngineUnit, 45)),
      blockValue: stringToNumber(valueAt(rawEngineUnit, 45)),
    },
    settings: {
      temperature: {
        minimalInner: stringToNumberWithDecimals(valueAt(rawEngineUnit, 6)),
        maximalInner: stringToNumberWithDecimals(valueAt(rawEngineUnit, 7)),
      },
      engine: {
        allowedLoad: stringToNumber(valueAt(rawEngineUnit, 0)),
        timeForEngineStart: stringToNumber(valueAt(rawEngineUnit, 1)),

        closedThreshold: stringToNumber(valueAt(rawEngineUnit, 2)),
        openedThreshold: stringToNumber(valueAt(rawEngineUnit, 3)),
        timeToBeOpenedInSeconds: stringToNumber(valueAt(rawEngineUnit, 4)),
      },
      misc: {
        pcTimeoutConnection: stringToNumber(valueAt(rawEngineUnit, 5)),

        emailPeriodInSeconds: stringToNumber(valueAt(rawEngineUnit, 9)),
        criticalEmailPeriodInSeconds: stringToNumber(
          valueAt(rawEngineUnit, 10),
        ),

        inspectionPeriodInSeconds: stringToNumber(valueAt(rawEngineUnit, 11)),
      },
    },
  };
};

export const rawThermalUnitToThermalUnit = (
  rawThermalUnit: RawThermalUnit,
  voltageConfig: VoltageConfig,
): ThermalUnit => {
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(valueAt(rawThermalUnit, 29)),
        outside: stringToNumberWithDecimals(valueAt(rawThermalUnit, 28)),
        casing: stringToNumberWithDecimals(valueAt(rawThermalUnit, 30)),
        top: stringToNumberWithDecimals(valueAt(rawThermalUnit, 32)),
        bottom: stringToNumberWithDecimals(valueAt(rawThermalUnit, 31)),

        isHeatingCasing: stringBooleanToBoolean(valueAt(rawThermalUnit, 24)),
        isHeatingAir: stringBooleanToBoolean(valueAt(rawThermalUnit, 25)),
        isCoolingAir: stringBooleanToBoolean(valueAt(rawThermalUnit, 26)),
      },
      voltage: {
        in: stringToVoltage(valueAt(rawThermalUnit, 35), voltageConfig),
        battery: stringToVoltage(valueAt(rawThermalUnit, 36), voltageConfig),
        units: stringToVoltage(valueAt(rawThermalUnit, 37), voltageConfig),
        gsm: stringToVoltage(valueAt(rawThermalUnit, 38), voltageConfig),
      },
      door: {
        isServiceDoorOpened: stringBooleanToBoolean(
          valueAt(rawThermalUnit, 23),
        ),
      },

      time: partitionedTimeToMoment(
        valueAt(rawThermalUnit, 39),
        valueAt(rawThermalUnit, 40),
        valueAt(rawThermalUnit, 41),
        valueAt(rawThermalUnit, 42),
        valueAt(rawThermalUnit, 43),
        valueAt(rawThermalUnit, 44),
      ),

      isBlocked: stringBooleanToBoolean(valueAt(rawThermalUnit, 46)),
      blockValue: stringToNumber(valueAt(rawThermalUnit, 46)),
    },
    settings: {
      temperature: {
        hysteresisHeating: stringToNumberWithDecimals(
          valueAt(rawThermalUnit, 1),
        ),
        hysteresisCooling: stringToNumberWithDecimals(
          valueAt(rawThermalUnit, 2),
        ),
        optimalInner: stringToNumberWithDecimals(valueAt(rawThermalUnit, 0)),
        minimalInner: stringToNumberWithDecimals(valueAt(rawThermalUnit, 3)),
        maximalInner: stringToNumberWithDecimals(valueAt(rawThermalUnit, 4)),
        maximalCasing: stringToNumberWithDecimals(valueAt(rawThermalUnit, 5)),
        maximalPeltier: stringToNumberWithDecimals(valueAt(rawThermalUnit, 7)),
      },
      voltage: {
        minimal: stringToVoltage(valueAt(rawThermalUnit, 6), voltageConfig),
      },
      misc: {
        emailPeriodInSeconds: stringToNumber(valueAt(rawThermalUnit, 8)),
      },
    },
  };
};
