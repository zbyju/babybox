import { getDefaultAppState } from "@/defaults/appState";
import { useConfigStore } from "@/pinia/configStore";
import type { EngineUnit, ThermalUnit } from "@/pinia/unitsStore";
import type { Connection } from "@/types/panel/connection";
import type { AppState } from "@/types/panel/main";
import { storeToRefs } from "pinia";

export const getNewState = (
  engineUnit: EngineUnit,
  thermalUnit: ThermalUnit,
  connection: Connection,
): AppState => {
  let result = getDefaultAppState();

  const configStore = useConfigStore();
  const { units } = storeToRefs(configStore);
  const warningThreshold = units.value.warningThreshold || 5;
  const errorThreshold = units.value.errorThreshold || 25;

  // X dni neprovedena zkouska
  const inspection = parseInt(engineUnit[33].value);
  if (inspection > 0) {
    result = {
      active: false,
      message: {
        text: `${inspection} dní neprovedena zkouška!`,
        color: "color-text-white",
      },
    };
  }

  // Different engine blockactions
  const engineBlock = parseInt(engineUnit[45].value);
  if (engineBlock & 256) {
    result = {
      active: false,
      message: {
        text: "Babybox mimo provoz",
        color: "color-text-warning",
      },
    };
  }
  if (engineBlock & 4 || engineBlock & 8) {
    result = {
      active: false,
      message: {
        text: "Teplota mimo rozsah",
        color: "color-text-warning",
      },
    };
  }
  if (engineBlock & 128) {
    result = {
      active: false,
      message: {
        text: "Porucha dvířek, babybox blokován!",
        color: "color-text-warning",
      },
    };
  }

  // Different thermal blockactions
  const thermalBlock = parseInt(thermalUnit[46].value);
  if (thermalBlock & 4) {
    result = {
      active: false,
      message: {
        text: "Závada v babyboxu!",
        color: "color-text-warning",
      },
    };
  }
  if (thermalBlock & 2) {
    result = {
      active: false,
      message: {
        text: "Závada záložního zdroje!",
        color: "color-text-warning",
      },
    };
  }
  if (thermalBlock & 1) {
    result = {
      active: false,
      message: {
        text: "Výpadek napětí!",
        color: "color-text-warning",
      },
    };
  }

  // Different engine states
  if (engineBlock & 2 && !(engineBlock & 1)) {
    result = {
      active: false,
      message: {
        text: "Babybox byl otevřen!",
        color: "color-text-warning",
        sound: "BylOtevren",
      },
    };
  }
  if (engineBlock & 64) {
    result = {
      active: false,
      message: {
        text: "Servisní dveře otevřeny",
        color: "color-text-warning",
      },
    };
  }

  // Different door states
  const doorState = parseInt(engineUnit[48].value);
  if (doorState & 1 || doorState & 2) {
    result = {
      active: false,
      message: {
        text: "Dvířka se otevírají",
        color: "color-text-success",
        sound: "Otevirani",
      },
    };
  }
  if (doorState & 4 || doorState & 64) {
    result = {
      active: false,
      message: {
        text: "Překážka ve dvířkách",
        color: "color-text-warning",
      },
    };
  }
  if (doorState & 8) {
    result = {
      active: false,
      message: {
        text: "Dvířka jsou otevřena",
        color: "color-text-success",
      },
    };
  }
  if (doorState & 16 || doorState & 32) {
    result = {
      active: false,
      message: {
        text: "Dvířka se zavírají",
        color: "color-text-success",
      },
    };
  }

  // Activation
  if (engineBlock & 1) {
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

  // Connection
  const errStreak: number =
    connection.engineUnit.failStreak + connection.thermalUnit.failStreak;

  if (errStreak > warningThreshold * 2) {
    result = {
      active: false,
      message: {
        text: "Navazuji spojení...",
        color: "color-text-warning",
      },
    };
  }
  if (errStreak > errorThreshold * 2) {
    result = {
      active: false,
      message: {
        text: "Chyba spojení!",
        color: "color-text-error",
        sound: "ZtrataSpojeni",
      },
    };
  }

  // Else return default state
  return result;
};
