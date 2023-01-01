import { config } from "..";
import { Action, Unit } from "../types/units.types";

export function actionToUrl(action: Action): string | undefined {
  switch (action) {
    case Action.OpenDoors:
      return `http://${config.units.engine.ip}/sdscep?sys141=201`;
    case Action.OpenServiceDoors:
      return `http://${config.units.engine.ip}/sdscep?sys141=202`;
    default:
      return undefined;
  }
}

export function unitToIp(unit: Unit): string {
  return unit === Unit.Engine
    ? config.units.engine.ip
    : config.units.thermal.ip;
}
