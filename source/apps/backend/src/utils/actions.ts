import { Action } from "../types/units.types.js";

/*
 * A missing or empty action is undefined. The route still passes a string.
 * actions.test.ts locks null and undefined.
 */
export function stringToAction(
  str: string | null | undefined
): Action | undefined {
  if (!str) return undefined;
  const lower = str.toLowerCase();
  return Object.values(Action).find((action) => action === lower);
}
