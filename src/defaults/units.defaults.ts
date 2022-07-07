import type {
  EngineUnit,
  ThermalUnit,
  RawEngineUnit,
  RawThermalUnit,
} from "@/types/panel/units-data.types";
import {
  partitionedTimeToMoment,
  stringBooleanToBoolean,
  stringToNumber,
  stringToNumberWithDecimals,
} from "@/utils/panel/conversions";

export const rawEngineUnitToEngineUnit = (
  rawEngineUnit: RawEngineUnit,
): EngineUnit => {
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(rawEngineUnit[28].value),
      },
      engine: {
        left: {
          load: stringToNumber(rawEngineUnit[35].value),
          position: stringToNumber(rawEngineUnit[37].value),
        },
        right: {
          load: stringToNumber(rawEngineUnit[36].value),
          position: stringToNumber(rawEngineUnit[38].value),
        },
      },
      door: {
        isBarrierInterrupted: stringBooleanToBoolean(rawEngineUnit[17].value),
        isServiceDoorOpened: stringBooleanToBoolean(rawEngineUnit[23].value),
      },
      timers: {
        inspectionMessage: stringToNumber(rawEngineUnit[59].value),
        serviceDoor: stringToNumber(rawEngineUnit[58].value),
      },
      time: partitionedTimeToMoment(
        rawEngineUnit[39].value,
        rawEngineUnit[40].value,
        rawEngineUnit[41].value,
        rawEngineUnit[42].value,
        rawEngineUnit[43].value,
        rawEngineUnit[44].value,
      ),
      isBlocked: stringBooleanToBoolean(rawEngineUnit[36].value),
    },
    settings: {
      temperature: {
        minimalInner: stringToNumberWithDecimals(rawEngineUnit[6].value),
        maximalInner: stringToNumberWithDecimals(rawEngineUnit[7].value),
      },
      engine: {
        allowedLoad: stringToNumber(rawEngineUnit[0].value),
        timeForEngineStart: stringToNumber(rawEngineUnit[1].value),

        closedThreshold: stringToNumber(rawEngineUnit[2].value),
        openedThreshold: stringToNumber(rawEngineUnit[3].value),
        timeToBeOpenedInSeconds: stringToNumber(rawEngineUnit[4].value),
      },
      misc: {
        pcTimeoutConnection: stringToNumber(rawEngineUnit[5].value),

        emailPeriodInSeconds: stringToNumber(rawEngineUnit[9].value),
        criticalEmailPeriodInSeconds: stringToNumber(rawEngineUnit[10].value),

        inspectionPeriodInSeconds: stringToNumber(rawEngineUnit[11].value),
      },
    },
  };
};

export const rawThermalUnitToThermalUnit = (
  rawThermalUnit: RawThermalUnit,
): ThermalUnit => {
  return {
    data: {
      temperature: {
        inner: stringToNumberWithDecimals(rawThermalUnit[29].value),
        outside: stringToNumberWithDecimals(rawThermalUnit[28].value),
        casing: stringToNumberWithDecimals(rawThermalUnit[30].value),
        top: stringToNumberWithDecimals(rawThermalUnit[32].value),
        bottom: stringToNumberWithDecimals(rawThermalUnit[31].value),

        isHeatingCasing: stringBooleanToBoolean(rawThermalUnit[24].value),
        isHeatingAir: stringBooleanToBoolean(rawThermalUnit[25].value),
        isCoolingAir: stringBooleanToBoolean(rawThermalUnit[26].value),
      },
      voltage: {
        in: stringToNumberWithDecimals(rawThermalUnit[35].value),
        battery: stringToNumberWithDecimals(rawThermalUnit[36].value),
        units: stringToNumberWithDecimals(rawThermalUnit[37].value),
        gsm: stringToNumberWithDecimals(rawThermalUnit[38].value),
      },
      door: {
        isServiceDoorOpened: stringBooleanToBoolean(rawThermalUnit[23].value),
      },

      time: partitionedTimeToMoment(
        rawThermalUnit[39].value,
        rawThermalUnit[40].value,
        rawThermalUnit[41].value,
        rawThermalUnit[42].value,
        rawThermalUnit[43].value,
        rawThermalUnit[44].value,
      ),
    },
    settings: {
      temperature: {
        hysteresisHeating: stringToNumberWithDecimals(rawThermalUnit[1].value),
        hysteresisCooling: stringToNumberWithDecimals(rawThermalUnit[2].value),
        optimalInner: stringToNumberWithDecimals(rawThermalUnit[0].value),
        minimalInner: stringToNumberWithDecimals(rawThermalUnit[3].value),
        maximalInner: stringToNumberWithDecimals(rawThermalUnit[4].value),
        maximalCasing: stringToNumberWithDecimals(rawThermalUnit[5].value),
        maximalPeltier: stringToNumberWithDecimals(rawThermalUnit[7].value),
      },
      voltage: {
        minimal: stringToNumberWithDecimals(rawThermalUnit[6].value),
      },
      misc: {
        emailPeriodInSeconds: stringToNumber(rawThermalUnit[8].value),
      },
    },
  };
};
