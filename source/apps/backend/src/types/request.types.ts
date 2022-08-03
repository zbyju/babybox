import { BothUnit, Unit } from "./units.types";

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

export function isInstanceOfPostUnitSettingsRequestBody(
  object: any
): object is PostUnitSettingsRequestBody {
  if (!object || typeof object !== "object") return false;
  return "settings" in object && isInstanceOfArraySetting(object.settings);
}

export interface GetUnitSettingsRequest {
  unit?: BothUnit;
  timeout?: number;
}

export function isInstanceOfGetUnitSettingsRequest(
  object: any
): object is GetUnitSettingsRequest {
  if (!object || typeof object !== "object") return false;
  if (
    object.unit &&
    object.unit !== "engine" &&
    object.unit !== "thermal" &&
    object.unit !== "both"
  ) {
    return false;
  }
  return true;
}

export interface CommonResponse {
  msg: string;
  status: number;
}

export interface CommonDataResponse extends CommonResponse {
  data?: any;
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

export function isInstanceOfSetting(object: any): object is Setting {
  if (!object || typeof object !== "object") return false;
  return (
    "index" in object &&
    "value" in object &&
    "unit" in object &&
    Number.isInteger(object.index) &&
    Number.isFinite(object.value) &&
    (object.unit === "engine" || object.unit === "thermal")
  );
}

export function isInstanceOfArraySetting(object: any): object is Setting[] {
  if (!object && object !== []) return false;
  return (
    Array.isArray(object) && object.every((o: any) => isInstanceOfSetting(o))
  );
}
