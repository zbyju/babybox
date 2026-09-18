import { ENGINE_RAM, RAM_FIELD_COUNT, THERMAL_RAM } from "@/logic/panel/ram";
import type { VoltageConfig } from "@/types/panel/config.types";
import type {
  EngineUnit,
  RawEngineUnit,
  RawThermalUnit,
  RawUnitVariable,
  ThermalUnit,
} from "@/types/panel/units.types";
import {
  partitionedTimeToUnixMs,
  stringBooleanToBoolean,
  stringToNumber,
  stringToNumberWithDecimals,
  stringToVoltage,
} from "@/utils/panel/conversions";

function field(raw: RawUnitVariable[], index: number): string {
  return raw[index].value;
}

export const rawEngineUnitToEngineUnit = (
  rawEngineUnit: RawEngineUnit,
): EngineUnit | undefined => {
  if (rawEngineUnit.length < RAM_FIELD_COUNT) return undefined;
  const v = (index: number) => field(rawEngineUnit, index);
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(v(ENGINE_RAM.INNER_TEMP)),
      },
      engine: {
        left: {
          load: stringToNumber(v(ENGINE_RAM.LEFT_LOAD)),
          position: stringToNumber(v(ENGINE_RAM.LEFT_POSITION)),
        },
        right: {
          load: stringToNumber(v(ENGINE_RAM.RIGHT_LOAD)),
          position: stringToNumber(v(ENGINE_RAM.RIGHT_POSITION)),
        },
      },
      door: {
        state: stringToNumber(v(ENGINE_RAM.DOOR_STATE)),

        isBarrierInterrupted: stringBooleanToBoolean(v(ENGINE_RAM.BARRIER)),
        isServiceDoorOpened: stringBooleanToBoolean(v(ENGINE_RAM.SERVICE_DOOR)),
      },
      timers: {
        inspectionMessage: stringToNumber(
          v(ENGINE_RAM.INSPECTION_MESSAGE_TIMER),
        ),
        serviceDoor: stringToNumber(v(ENGINE_RAM.SERVICE_DOOR_TIMER)),
      },
      misc: {
        inspectionNotDoneForDays: stringToNumber(
          v(ENGINE_RAM.INSPECTION_NOT_DONE_DAYS),
        ),
      },
      time: partitionedTimeToUnixMs(
        v(ENGINE_RAM.TIME_DAY),
        v(ENGINE_RAM.TIME_MONTH),
        v(ENGINE_RAM.TIME_YEAR),
        v(ENGINE_RAM.TIME_HOUR),
        v(ENGINE_RAM.TIME_MINUTE),
        v(ENGINE_RAM.TIME_SECOND),
      ),
      isBlocked: stringBooleanToBoolean(v(ENGINE_RAM.BLOCK)),
      blockValue: stringToNumber(v(ENGINE_RAM.BLOCK)),
    },
    settings: {
      temperature: {
        minimalInner: stringToNumberWithDecimals(v(ENGINE_RAM.MIN_INNER_TEMP)),
        maximalInner: stringToNumberWithDecimals(v(ENGINE_RAM.MAX_INNER_TEMP)),
      },
      engine: {
        allowedLoad: stringToNumber(v(ENGINE_RAM.ALLOWED_LOAD)),
        timeForEngineStart: stringToNumber(v(ENGINE_RAM.TIME_FOR_ENGINE_START)),

        closedThreshold: stringToNumber(v(ENGINE_RAM.CLOSED_THRESHOLD)),
        openedThreshold: stringToNumber(v(ENGINE_RAM.OPENED_THRESHOLD)),
        timeToBeOpenedInSeconds: stringToNumber(
          v(ENGINE_RAM.TIME_TO_BE_OPENED),
        ),
      },
      misc: {
        pcTimeoutConnection: stringToNumber(v(ENGINE_RAM.PC_TIMEOUT)),

        emailPeriodInSeconds: stringToNumber(v(ENGINE_RAM.EMAIL_PERIOD)),
        criticalEmailPeriodInSeconds: stringToNumber(
          v(ENGINE_RAM.CRITICAL_EMAIL_PERIOD),
        ),

        inspectionPeriodInSeconds: stringToNumber(
          v(ENGINE_RAM.INSPECTION_PERIOD),
        ),
      },
    },
  };
};

export const rawThermalUnitToThermalUnit = (
  rawThermalUnit: RawThermalUnit,
  voltageConfig: VoltageConfig,
): ThermalUnit | undefined => {
  if (rawThermalUnit.length < RAM_FIELD_COUNT) return undefined;
  const v = (index: number) => field(rawThermalUnit, index);
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(v(THERMAL_RAM.INNER_TEMP)),
        outside: stringToNumberWithDecimals(v(THERMAL_RAM.OUTSIDE_TEMP)),
        casing: stringToNumberWithDecimals(v(THERMAL_RAM.CASING_TEMP)),
        top: stringToNumberWithDecimals(v(THERMAL_RAM.TOP_TEMP)),
        bottom: stringToNumberWithDecimals(v(THERMAL_RAM.BOTTOM_TEMP)),

        isHeatingCasing: stringBooleanToBoolean(v(THERMAL_RAM.HEATING_CASING)),
        isHeatingAir: stringBooleanToBoolean(v(THERMAL_RAM.HEATING_AIR)),
        isCoolingAir: stringBooleanToBoolean(v(THERMAL_RAM.COOLING_AIR)),
      },
      voltage: {
        in: stringToVoltage(v(THERMAL_RAM.VOLTAGE_IN), voltageConfig),
        battery: stringToVoltage(v(THERMAL_RAM.VOLTAGE_BATTERY), voltageConfig),
        units: stringToVoltage(v(THERMAL_RAM.VOLTAGE_UNITS), voltageConfig),
        gsm: stringToVoltage(v(THERMAL_RAM.VOLTAGE_GSM), voltageConfig),
      },
      door: {
        isServiceDoorOpened: stringBooleanToBoolean(
          v(THERMAL_RAM.SERVICE_DOOR),
        ),
      },

      time: partitionedTimeToUnixMs(
        v(THERMAL_RAM.TIME_DAY),
        v(THERMAL_RAM.TIME_MONTH),
        v(THERMAL_RAM.TIME_YEAR),
        v(THERMAL_RAM.TIME_HOUR),
        v(THERMAL_RAM.TIME_MINUTE),
        v(THERMAL_RAM.TIME_SECOND),
      ),

      isBlocked: stringBooleanToBoolean(v(THERMAL_RAM.BLOCK)),
      blockValue: stringToNumber(v(THERMAL_RAM.BLOCK)),
    },
    settings: {
      temperature: {
        hysteresisHeating: stringToNumberWithDecimals(
          v(THERMAL_RAM.HYSTERESIS_HEATING),
        ),
        hysteresisCooling: stringToNumberWithDecimals(
          v(THERMAL_RAM.HYSTERESIS_COOLING),
        ),
        optimalInner: stringToNumberWithDecimals(v(THERMAL_RAM.OPTIMAL_INNER)),
        minimalInner: stringToNumberWithDecimals(v(THERMAL_RAM.MIN_INNER)),
        maximalInner: stringToNumberWithDecimals(v(THERMAL_RAM.MAX_INNER)),
        maximalCasing: stringToNumberWithDecimals(v(THERMAL_RAM.MAX_CASING)),
        maximalPeltier: stringToNumberWithDecimals(v(THERMAL_RAM.MAX_PELTIER)),
      },
      voltage: {
        minimal: stringToVoltage(v(THERMAL_RAM.MIN_VOLTAGE), voltageConfig),
      },
      misc: {
        emailPeriodInSeconds: stringToNumber(v(THERMAL_RAM.EMAIL_PERIOD)),
      },
    },
  };
};
