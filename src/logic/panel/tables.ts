import type { Maybe } from "@/types/generic.types";
import type { Connection } from "@/types/panel/connection.types";
import {
  type TableConnectionValues,
  type TableDoorsValues,
  type TableTemperaturesValues,
  type TableVoltagesValues,
  TableBlockState,
  TableRowState,
  TableValuesState,
} from "@/types/panel/tables.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import {
  booleanToTableBlockState,
  maybeValueToTableRowValue,
} from "../../utils/panel/conversions";
import {
  displayCustomBoolean,
  displayPercentage,
  displayTemperature,
  displayTwoItems,
  displayVoltage,
  isLower,
  prettyNumber,
  secondsToTime,
} from "../../utils/panel/dataDisplay";

export const getTableConnectionValues = (
  engineData: Maybe<EngineUnit>,
  _: Maybe<ThermalUnit>,
  connection: Connection,
  units: any,
): TableConnectionValues => {
  return {
    state: TableValuesState.Ok,
    blockValues: {},
    rowValues: {
      requests: {
        state: TableRowState.Ok,
        value: displayTwoItems(
          connection.engineUnit.requests,
          connection.thermalUnit.requests,
          prettyNumber,
        ),
      },
      successfulRequests: {
        state: TableRowState.Ok,
        value: displayTwoItems(
          connection.engineUnit.successes,
          connection.thermalUnit.successes,
          prettyNumber,
        ),
      },
      failedRequests: {
        state: TableRowState.Ok,
        value: displayTwoItems(
          connection.engineUnit.fails,
          connection.thermalUnit.fails,
          prettyNumber,
        ),
      },
      quality: {
        state: TableRowState.Ok,
        value: displayTwoItems(
          connection.engineUnit.getQuality(),
          connection.thermalUnit.getQuality(),
          displayPercentage,
        ),
      },
      timeout: {
        state: TableRowState.Ok,
        value: units.value.requestTimeout + "ms",
      },
      timeToInspection: maybeValueToTableRowValue(
        engineData?.data.timers.inspectionMessage,
        secondsToTime,
      ),
    },
  };
};

export const getTableDoorsValues = (
  engineData: Maybe<EngineUnit>,
  _: Maybe<ThermalUnit>,
): TableDoorsValues => {
  if (engineData === undefined) {
    return {
      state: TableValuesState.Error,
    };
  }
  return {
    state: TableValuesState.Ok,
    blockValues: {
      isBlocked: {
        state: booleanToTableBlockState(
          engineData?.data.isBlocked,
          TableBlockState.ColorError,
        ),
      },
    },
    rowValues: {
      leftLoad: maybeValueToTableRowValue(
        engineData?.data.engine.left.load,
        prettyNumber,
      ),
      rightLoad: maybeValueToTableRowValue(
        engineData?.data.engine.right.load,
        prettyNumber,
      ),
      leftPosition: maybeValueToTableRowValue(
        engineData?.data.engine.left.position,
        prettyNumber,
      ),
      rightPosition: maybeValueToTableRowValue(
        engineData?.data.engine.right.position,
        prettyNumber,
      ),
      beamAboveContainer: maybeValueToTableRowValue(
        engineData?.data.door.isBarrierInterrupted,
        displayCustomBoolean,
        ["Překážka", "Volno"],
      ),
    },
  };
};

export const getTableTemperaturesValues = (
  _: Maybe<EngineUnit>,
  thermalData: Maybe<ThermalUnit>,
): TableTemperaturesValues => {
  if (thermalData === undefined) {
    return {
      state: TableValuesState.Error,
    };
  }
  return {
    state: TableValuesState.Ok,
    blockValues: {
      isHeatingCasing: {
        state: booleanToTableBlockState(
          thermalData?.data.temperature.isHeatingCasing,
        ),
      },
      isHeatingAir: {
        state: booleanToTableBlockState(
          thermalData?.data.temperature.isHeatingAir,
        ),
      },
      isCoolingAir: {
        state: booleanToTableBlockState(
          thermalData?.data.temperature.isCoolingAir,
        ),
      },
    },
    rowValues: {
      optimalTemperature: maybeValueToTableRowValue(
        thermalData?.settings.temperature.optimalInner,
        displayTemperature,
      ),
      innerTemperature: maybeValueToTableRowValue(
        thermalData?.data.temperature.inner,
        displayTemperature,
      ),
      outsideTemperature: maybeValueToTableRowValue(
        thermalData?.data.temperature.outside,
        displayTemperature,
      ),
      bottomTemperature: maybeValueToTableRowValue(
        thermalData?.data.temperature.bottom,
        displayTemperature,
      ),
      topTemperature: maybeValueToTableRowValue(
        thermalData?.data.temperature.top,
        displayTemperature,
      ),
      casingTemperature: maybeValueToTableRowValue(
        thermalData?.data.temperature.casing,
        displayTemperature,
      ),
    },
  };
};

export const getTableVoltageValues = (
  _: Maybe<EngineUnit>,
  thermalData: Maybe<ThermalUnit>,
): TableVoltagesValues => {
  if (thermalData === undefined) {
    return {
      state: TableValuesState.Error,
    };
  }
  return {
    state: TableValuesState.Ok,
    blockValues: {},
    rowValues: {
      inVoltage: maybeValueToTableRowValue(
        thermalData?.data.voltage.in,
        displayVoltage,
        [],
        isLower(
          thermalData?.data.voltage.in,
          thermalData?.settings.voltage.minimal,
        )
          ? TableRowState.ColorError
          : TableRowState.Ok,
      ),
      batteryVoltage: maybeValueToTableRowValue(
        thermalData?.data.voltage.battery,
        displayVoltage,
        [],
        isLower(
          thermalData?.data.voltage.battery,
          thermalData?.settings.voltage.minimal,
        )
          ? TableRowState.ColorError
          : TableRowState.Ok,
      ),
      unitsVoltage: maybeValueToTableRowValue(
        thermalData?.data.voltage.units,
        displayVoltage,
        [],
        isLower(
          thermalData?.data.voltage.units,
          thermalData?.settings.voltage.minimal,
        )
          ? TableRowState.ColorError
          : TableRowState.Ok,
      ),
      gsmVoltage: maybeValueToTableRowValue(
        thermalData?.data.voltage.gsm,
        displayVoltage,
        [],
        isLower(
          thermalData?.data.voltage.gsm,
          thermalData?.settings.voltage.minimal,
        )
          ? TableRowState.ColorError
          : TableRowState.Ok,
      ),
      inGoalVoltage: {
        state: TableRowState.Ok,
        value: "14-15V",
      },
      batteryGoalVoltage: {
        state: TableRowState.Ok,
        value: "12.8-14V",
      },
      unitsGoalVoltage: {
        state: TableRowState.Ok,
        value: "12.1-13V",
      },
    },
  };
};
