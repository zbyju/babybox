import { getDefaultPanelState } from "@/defaults/panelState.default";
import type { Maybe } from "@/types/generic.types";
import type { UnitsConfig } from "@/types/panel/config.types";
import type { Connection } from "@/types/panel/connection.types";
import type { PanelState } from "@/types/panel/main.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";
import { daysToString } from "@/utils/panel/dataDisplay";

import { DOOR_STATE, ENGINE_BLOCK, THERMAL_BLOCK } from "./flags";

export const getNewState = (
  engineUnit: Maybe<EngineUnit>,
  thermalUnit: Maybe<ThermalUnit>,
  connection: Connection,
  unitsConfig: UnitsConfig,
): PanelState => {
  let result = getDefaultPanelState();

  const warningThreshold = unitsConfig.warningThreshold || 5;
  const errorThreshold = unitsConfig.errorThreshold || 25;
  const requestDelay = unitsConfig.requestDelay || 2000;

  const inspection = engineUnit?.data.misc.inspectionNotDoneForDays;
  if (inspection !== undefined && inspection > 0) {
    result = {
      active: false,
      message: {
        text: `${inspection} ${daysToString(inspection)} neprovedena zkouška!`,
        color: "color-text-white",
      },
    };
  }

  const engineBlock = engineUnit?.data.blockValue;
  if (engineBlock !== undefined) {
    if (engineBlock & ENGINE_BLOCK.OUT_OF_SERVICE) {
      result = {
        active: false,
        message: {
          text: "Babybox mimo provoz",
          color: "color-text-warning",
        },
      };
    }
    if (
      engineBlock & ENGINE_BLOCK.TEMPERATURE_A ||
      engineBlock & ENGINE_BLOCK.TEMPERATURE_B
    ) {
      result = {
        active: false,
        message: {
          text: "Teplota mimo rozsah",
          color: "color-text-warning",
        },
      };
    }
    if (engineBlock & ENGINE_BLOCK.DOOR_FAULT) {
      result = {
        active: false,
        message: {
          text: "Porucha dvířek, babybox blokován!",
          color: "color-text-warning",
        },
      };
    }
  }

  const thermalBlock = thermalUnit?.data.blockValue;
  if (thermalBlock !== undefined) {
    if (thermalBlock & THERMAL_BLOCK.STABILIZED_RAIL) {
      result = {
        active: false,
        message: {
          text: "Závada v babyboxu!",
          color: "color-text-warning",
        },
      };
    }
    if (thermalBlock & THERMAL_BLOCK.BATTERY) {
      result = {
        active: false,
        message: {
          text: "Závada záložního zdroje!",
          color: "color-text-warning",
        },
      };
    }
    if (thermalBlock & THERMAL_BLOCK.INPUT_VOLTAGE) {
      result = {
        active: false,
        message: {
          text: "Výpadek napětí!",
          color: "color-text-warning",
        },
      };
    }
  }

  if (engineBlock !== undefined) {
    if (
      engineBlock & ENGINE_BLOCK.WAS_OPENED &&
      !(engineBlock & ENGINE_BLOCK.ACTIVE)
    ) {
      result = {
        active: false,
        message: {
          text: "Babybox byl otevřen!",
          color: "color-text-warning",
          sound: "BylOtevren",
        },
      };
    }
    if (engineBlock & ENGINE_BLOCK.SERVICE_DOORS) {
      result = {
        active: false,
        message: {
          text: "Servisní dveře otevřeny",
          color: "color-text-warning",
        },
      };
    }
  }

  const doorState = engineUnit?.data.door.state;
  if (doorState !== undefined) {
    if (doorState & DOOR_STATE.OPENING_A || doorState & DOOR_STATE.OPENING_B) {
      result = {
        active: false,
        message: {
          text: "Dvířka se otevírají",
          color: "color-text-success",
          sound: "Otevirani",
        },
      };
    }
    if (
      doorState & DOOR_STATE.OBSTACLE_A ||
      doorState & DOOR_STATE.OBSTACLE_B
    ) {
      result = {
        active: false,
        message: {
          text: "Překážka ve dvířkách",
          color: "color-text-warning",
        },
      };
    }
    if (doorState & DOOR_STATE.OPEN) {
      result = {
        active: false,
        message: {
          text: "Dvířka jsou otevřena",
          color: "color-text-success",
        },
      };
    }
    if (doorState & DOOR_STATE.CLOSING_A || doorState & DOOR_STATE.CLOSING_B) {
      result = {
        active: false,
        message: {
          text: "Dvířka se zavírají",
          color: "color-text-success",
        },
      };
    }
  }

  if (engineBlock !== undefined && engineBlock & ENGINE_BLOCK.ACTIVE) {
    result = {
      active: true,
      message: {
        text: "Babybox AKTIVNÍ!",
        color: "color-text-error",
        sound: "Aktivace",
      },
    };
  }
  /* TODO: Possible bug here -
           the previous version resets the sound only after
           if( (BlokaceMot & 1)==0 && (BlokaceMot & 2)==0 ) */

  /*
   * Connection.
   *
   * The thresholds are counts of failed requests at the nominal poll rate, so
   * turn them into a time budget: threshold * requestDelay is the downtime the
   * count used to stand for. Requests to one unit now run in sequence, so a
   * tick costs the read timeout plus the delay and counting failures would push
   * the alarm out by several times. The * 2 keeps the old shape, where a single
   * dead unit takes twice as long to alarm as both dead together.
   */
  const downtime: number =
    connection.engineUnit.failStreakMs + connection.thermalUnit.failStreakMs;

  if (downtime > warningThreshold * 2 * requestDelay) {
    result = {
      active: false,
      message: {
        text: "Navazuji spojení...",
        color: "color-text-warning",
      },
    };
  }
  if (downtime > errorThreshold * 2 * requestDelay) {
    result = {
      active: false,
      message: {
        text: "Chyba spojení!",
        color: "color-text-error",
        sound: "ZtrataSpojeni",
      },
    };
  }

  return result;
};
