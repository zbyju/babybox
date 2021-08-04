import { AppState, State } from "@/types/main";

export const getNewState = (state: State): AppState => {
  // X dni neprovedena zkouska
  const inspection = parseInt(state.engineUnit[33].value);
  if (inspection > 0) {
    return {
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
    return {
      active: false,
      message: {
        text: "Babybox mimo provoz",
        color: "text-warning",
      },
    };
  }
  if (engineBlock & 4 || engineBlock & 8) {
    return {
      active: false,
      message: {
        text: "Teplota mimo rozsah",
        color: "text-warning",
      },
    };
  }
  if (engineBlock & 128) {
    return {
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
    return {
      active: false,
      message: {
        text: "Závada v babyboxu!",
        color: "text-warning",
      },
    };
  }
  if (thermalBlock & 2) {
    return {
      active: false,
      message: {
        text: "Závada záložního zdroje!",
        color: "text-warning",
      },
    };
  }
  if (thermalBlock & 1) {
    return {
      active: false,
      message: {
        text: "Výpadek napětí!",
        color: "text-warning",
      },
    };
  }

  // Different engine states
  if (engineBlock & 2 && !(engineBlock & 1)) {
    return {
      active: false,
      message: {
        text: "Babybox byl otevřen!",
        color: "text-warning",
        sound: "BylOtevren.wma",
      },
    };
  }
  if (engineBlock & 64) {
    return {
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
    return {
      active: false,
      message: {
        text: "Dvířka se otevírají",
        color: "text-success",
        sound: "Otevirani.wma",
      },
    };
  }
  if (doorState & 4 || doorState & 64) {
    return {
      active: false,
      message: {
        text: "Překážka ve dvířkách",
        color: "text-warning",
      },
    };
  }
  if (doorState & 8) {
    return {
      active: false,
      message: {
        text: "Dvířka jsou otevřena",
        color: "text-success",
      },
    };
  }
  if (doorState & 16 || doorState & 32) {
    return {
      active: false,
      message: {
        text: "Dvířka se zavírají",
        color: "text-success",
      },
    };
  }

  // Activation
  if (engineBlock & 1) {
    return {
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
  // TODO: Connection error
};
