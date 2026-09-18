import {
  GetUnitSettingsRequestSchema,
  PostUnitSettingsRequestBodySchema,
  SettingSchema,
} from "../schemas/request";
import type { UnitBody } from "../schemas/unit-body";
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
  object: unknown
): object is PostUnitSettingsRequestBody {
  return PostUnitSettingsRequestBodySchema.safeParse(object).success;
}

export interface GetUnitSettingsRequest {
  unit?: BothUnit;
  timeout?: number;
}

export function isInstanceOfGetUnitSettingsRequest(
  object: unknown
): object is GetUnitSettingsRequest {
  return GetUnitSettingsRequestSchema.safeParse(object).success;
}

export interface CommonResponse {
  msg: string;
  status: number;
}

export interface CommonDataResponse extends CommonResponse {
  data?: UnitBody | { engine: unknown; thermal: unknown };
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
  return SettingSchema.safeParse(object).success;
}

export function isInstanceOfArraySetting(object: unknown): object is Setting[] {
  if (!Array.isArray(object)) return false;
  return object.every((item) => isInstanceOfSetting(item));
}
