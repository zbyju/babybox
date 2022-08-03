import { Action } from "../types/units.types";

function enumFromStringValue<T>(
  enm: { [s: string]: T },
  value: string
): T | undefined {
  return (Object.values(enm) as unknown as string[]).includes(value)
    ? (value as unknown as T)
    : undefined;
}

export function stringToAction(str: string): Action | undefined {
  if (!str) return undefined;
  return enumFromStringValue(Action, str.toLowerCase());
}
