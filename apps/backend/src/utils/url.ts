import { Action, Unit } from "../types/units.types";

export function actionToUrl(action: Action): string | undefined {
  switch (action) {
    case Action.OpenDoors:
      return `http://${process.env.ENGINE_UNIT_IP}/sdscep?sys141=201`;
    case Action.OpenServiceDoors:
      return `http://${process.env.ENGINE_UNIT_IP}/sdscep?sys141=202`;
    default:
      return undefined;
  }
}

export function unitToIp(unit: Unit): string {
  return unit === Unit.Engine
    ? process.env.ENGINE_UNIT_IP
    : process.env.THERMAL_UNIT_IP;
}
