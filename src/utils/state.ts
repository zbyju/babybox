import { getDefaultAppState } from "@/defaults/appState";
import { AppState, State } from "@/types/main";

export const getNewState = (state: State): AppState => {
  let result = getDefaultAppState();

  const errThreshold1 = 5;
  const errThreshold2 = 25;

  // X dni neprovedena zkouska
  const inspection = parseInt(state.engineUnit[33].value);
  if (inspection > 0) {
    result = {
      active: false,
      message: {
        text: `${inspection} dní neprovedena zkouška!`,
        color: "text-white",
      },
    };
  }

  // Different engine blockactions
  const engineBlock = parseInt(state.engineUnit[45].value);
  if (engineBlock & 256) {
    result = {
      active: false,
      message: {
        text: "Babybox mimo provoz",
        color: "text-warning",
      },
    };
  }
  if (engineBlock & 4 || engineBlock & 8) {
    result = {
      active: false,
      message: {
        text: "Teplota mimo rozsah",
        color: "text-warning",
      },
    };
  }
  if (engineBlock & 128) {
    result = {
      active: false,
      message: {
        text: "Porucha dvířek, babybox blokován!",
        color: "text-warning",
      },
    };
  }

  // Different thermal blockactions
  const thermalBlock = parseInt(state.thermalUnit[46].value);
  if (thermalBlock & 4) {
    result = {
      active: false,
      message: {
        text: "Závada v babyboxu!",
        color: "text-warning",
      },
    };
  }
  if (thermalBlock & 2) {
    result = {
      active: false,
      message: {
        text: "Závada záložního zdroje!",
        color: "text-warning",
      },
    };
  }
  if (thermalBlock & 1) {
    result = {
      active: false,
      message: {
        text: "Výpadek napětí!",
        color: "text-warning",
      },
    };
  }

  // Different engine states
  if (engineBlock & 2 && !(engineBlock & 1)) {
    result = {
      active: false,
      message: {
        text: "Babybox byl otevřen!",
        color: "text-warning",
        sound: "BylOtevren.wma",
      },
    };
  }
  if (engineBlock & 64) {
    result = {
      active: false,
      message: {
        text: "Servisní dveře otevřeny",
        color: "text-warning",
      },
    };
  }

  // Different door states
  const doorState = parseInt(state.engineUnit[48].value);
  if (doorState & 1 || doorState & 2) {
    result = {
      active: false,
      message: {
        text: "Dvířka se otevírají",
        color: "text-success",
        sound: "Otevirani.wma",
      },
    };
  }
  if (doorState & 4 || doorState & 64) {
    result = {
      active: false,
      message: {
        text: "Překážka ve dvířkách",
        color: "text-warning",
      },
    };
  }
  if (doorState & 8) {
    result = {
      active: false,
      message: {
        text: "Dvířka jsou otevřena",
        color: "text-success",
      },
    };
  }
  if (doorState & 16 || doorState & 32) {
    result = {
      active: false,
      message: {
        text: "Dvířka se zavírají",
        color: "text-success",
      },
    };
  }

  // Activation
  if (engineBlock & 1) {
    result = {
      active: true,
      message: {
        text: "Babybox AKTIVNÍ!",
        color: "text-error",
        sound: "Aktivace.wma",
      },
    };
  }
  /* TODO: Possible bug here -
           the previous version resets the sound only after
           if( (BlokaceMot & 1)==0 && (BlokaceMot & 2)==0 ) */

  // Connection
  const errStreak: number =
    state.connection.engineUnit.failStreak +
    state.connection.thermalUnit.failStreak;
  console.log(errStreak);
  if (errStreak > errThreshold1 * 2) {
    result = {
      active: false,
      message: {
        text: "Navazuji spojení...",
        color: "text-warning",
      },
    };
  }
  if (errStreak > errThreshold2 * 2) {
    result = {
      active: false,
      message: {
        text: "Chyba spojení!",
        color: "text-error",
        sound: "ZtrataSpojeni.wma",
      },
    };
  }

  // Else return default state
  return result;
};
