import type { BothUnit, Unit } from "./units.types.js";

export interface CommonDataRequestQuery {
  timeout?: number;
  raw?: boolean;
}

export type EngineDataRequestQuery = CommonDataRequestQuery;
export type ThermalDataRequestQuery = CommonDataRequestQuery;

export interface PostUnitSettingsRequestBody {
  settings: Setting[];
  options?: {
    timeout?: number;
  };
}

// Arrays pass too, as they did before; none of the checks below accepts one.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isInstanceOfPostUnitSettingsRequestBody(
  object: unknown
): object is PostUnitSettingsRequestBody {
  if (!isObject(object)) return false;
  return "settings" in object && isInstanceOfArraySetting(object["settings"]);
}

export interface GetUnitSettingsRequest {
  unit?: BothUnit;
  timeout?: number;
}

export function isInstanceOfGetUnitSettingsRequest(
  object: unknown
): object is GetUnitSettingsRequest {
  if (!isObject(object)) return false;
  const unit = object["unit"];
  if (unit && unit !== "engine" && unit !== "thermal" && unit !== "both") {
    return false;
  }
  return true;
}

export interface CommonResponse {
  msg: string;
  status: number;
}

export interface CommonDataResponse extends CommonResponse {
  data?: unknown;
}

export interface CommonSettingsResponse extends CommonResponse {
  results: SettingResult[];
}

export interface Setting {
  index: number;
  value: number;
  unit: Unit;
}

export interface SettingResult extends Setting {
  result: boolean;
}

export function isInstanceOfSetting(object: unknown): object is Setting {
  if (!isObject(object)) return false;
  return (
    "index" in object &&
    "value" in object &&
    "unit" in object &&
    Number.isInteger(object["index"]) &&
    Number.isFinite(object["value"]) &&
    (object["unit"] === "engine" || object["unit"] === "thermal")
  );
}

export function isInstanceOfArraySetting(object: unknown): object is Setting[] {
  if (!object) return false;
  return (
    Array.isArray(object) &&
    object.every((o: unknown) => isInstanceOfSetting(o))
  );
}
