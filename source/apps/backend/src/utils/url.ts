import { config } from "..";
import { Action, Unit } from "../types/units.types";

/*
 * One entry per action, so a new Action does not compile until its unit and
 * path are filled in. Two switch statements held this before and could drift
 * apart, which reached the operator as a 400 "Unknown action".
 */
const actionTargets: Record<Action, { unit: Unit; path: string }> = {
  [Action.OpenDoors]: { unit: Unit.Engine, path: "/sdscep?sys141=201" },
  [Action.OpenServiceDoors]: { unit: Unit.Engine, path: "/sdscep?sys141=202" },
};

export function actionToUrl(action: Action): string | undefined {
  const target = actionTargets[action];
  if (target === undefined) return undefined;
  return `http://${unitToIp(target.unit)}${target.path}`;
}

export function actionToUnit(action: Action): Unit | undefined {
  return actionTargets[action]?.unit;
}

export function unitToIp(unit: Unit): string {
  return unit === Unit.Engine
    ? config.units.engine.ip
    : config.units.thermal.ip;
}
