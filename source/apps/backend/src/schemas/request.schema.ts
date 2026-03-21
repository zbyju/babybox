import { z } from "zod";

// Enums
export const UnitSchema = z.enum(["engine", "thermal"]);
export const BothUnitSchema = z.enum(["engine", "thermal", "both"]);

// Common data request query
export const CommonDataRequestQuerySchema = z.object({
  timeout: z.coerce.number().int().positive().optional(),
  raw: z.coerce.boolean().optional(),
});

export const EngineDataRequestQuerySchema = CommonDataRequestQuerySchema;
export const ThermalDataRequestQuerySchema = CommonDataRequestQuerySchema;

// Setting
export const SettingSchema = z.object({
  index: z.number().int().nonnegative(),
  value: z.number().finite(),
  unit: UnitSchema,
});

export const SettingResultSchema = SettingSchema.extend({
  result: z.boolean(),
});

// Post unit settings request body
export const PostUnitSettingsRequestBodySchema = z
  .object({
    settings: z.array(SettingSchema),
    options: z
      .object({
        timeout: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .passthrough();

// Get unit settings request
export const GetUnitSettingsRequestSchema = z
  .object({
    unit: BothUnitSchema.optional(),
    timeout: z.coerce.number().int().positive().optional(),
  })
  .passthrough();

// Common response
export const CommonResponseSchema = z.object({
  msg: z.string(),
  status: z.number().int(),
});

export const CommonDataResponseSchema = CommonResponseSchema.extend({
  data: z.unknown().optional(),
});

export const CommonSettingsResponseSchema = CommonResponseSchema.extend({
  results: z.array(SettingResultSchema),
});

// Infer types from schemas
export type Unit = z.infer<typeof UnitSchema>;
export type BothUnit = z.infer<typeof BothUnitSchema>;
export type CommonDataRequestQuery = z.infer<typeof CommonDataRequestQuerySchema>;
export type EngineDataRequestQuery = z.infer<typeof EngineDataRequestQuerySchema>;
export type ThermalDataRequestQuery = z.infer<typeof ThermalDataRequestQuerySchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type SettingResult = z.infer<typeof SettingResultSchema>;
export type PostUnitSettingsRequestBody = z.infer<typeof PostUnitSettingsRequestBodySchema>;
export type GetUnitSettingsRequest = z.infer<typeof GetUnitSettingsRequestSchema>;
export type CommonResponse = z.infer<typeof CommonResponseSchema>;
export type CommonDataResponse = z.infer<typeof CommonDataResponseSchema>;
export type CommonSettingsResponse = z.infer<typeof CommonSettingsResponseSchema>;
