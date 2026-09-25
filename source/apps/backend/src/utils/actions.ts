import { Action } from "../types/units.types.js";

export function stringToAction(str: string): Action | undefined {
  if (!str) return undefined;
  const lower = str.toLowerCase();
  return Object.values(Action).find((action) => action === lower);
}
