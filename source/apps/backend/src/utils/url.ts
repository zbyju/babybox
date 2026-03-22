import { getConfig } from "../state/config";
import { Action } from "../types/units.types";

export function actionToUrl(action: Action): string | undefined {
  const config = getConfig();
  switch (action) {
    case Action.OpenDoors:
      return `http://${config.units.engine.ip}/sdscep?sys141=201`;
    case Action.OpenServiceDoors:
      return `http://${config.units.engine.ip}/sdscep?sys141=202`;
    default:
      return undefined;
  }
}

export function unitToIp(unit: "engine" | "thermal"): string {
  const config = getConfig();
  return unit === "engine" ? config.units.engine.ip : config.units.thermal.ip;
}
