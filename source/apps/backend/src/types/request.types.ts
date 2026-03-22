import {
  SettingSchema,
  PostUnitSettingsRequestBodySchema,
  GetUnitSettingsRequestSchema,
} from "../schemas/request.schema";

// Re-export types from schema
export type {
  Unit,
  BothUnit,
  CommonDataRequestQuery,
  EngineDataRequestQuery,
  ThermalDataRequestQuery,
  Setting,
  SettingResult,
  PostUnitSettingsRequestBody,
  GetUnitSettingsRequest,
  CommonResponse,
  CommonDataResponse,
  CommonSettingsResponse,
} from "../schemas/request.schema";

// Legacy type guards using Zod schemas
export function isInstanceOfPostUnitSettingsRequestBody(
  object: unknown
): object is import("../schemas/request.schema.js").PostUnitSettingsRequestBody {
  return PostUnitSettingsRequestBodySchema.safeParse(object).success;
}

export function isInstanceOfGetUnitSettingsRequest(
  object: unknown
): object is import("../schemas/request.schema.js").GetUnitSettingsRequest {
  return GetUnitSettingsRequestSchema.safeParse(object).success;
}

export function isInstanceOfSetting(
  object: unknown
): object is import("../schemas/request.schema.js").Setting {
  return SettingSchema.safeParse(object).success;
}

export function isInstanceOfArraySetting(
  object: unknown
): object is import("../schemas/request.schema.js").Setting[] {
  if (!Array.isArray(object)) return false;
  return object.every((o) => SettingSchema.safeParse(o).success);
}
