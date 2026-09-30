import { Action } from "../types/units.types.js";

/*
 * actions.test.ts locks null and undefined.
 * The route still passes a string.
 */
export function stringToAction(
  str: string | null | undefined
): Action | undefined {
  if (!str) return undefined;
  const lower = str.toLowerCase();
  return Object.values(Action).find((action) => action === lower);
}
