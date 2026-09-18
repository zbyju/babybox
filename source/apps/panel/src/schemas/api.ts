import { z } from "zod";

import { RAM_FIELD_COUNT } from "@/logic/panel/ram";

export const RawUnitFieldSchema = z.object({
  index: z.number().int().nonnegative(),
  value: z.string(),
  label: z.string().optional(),
});

export const RawUnitSchema = z
  .array(RawUnitFieldSchema)
  .refine((fields) => fields.length >= RAM_FIELD_COUNT, {
    message: `expected at least ${RAM_FIELD_COUNT} RAM fields`,
  });

export const UnitDataResponseSchema = z.object({
  msg: z.string().optional(),
  data: z.string(),
});

export const SettingSchema = z.object({
  index: z.number().int(),
  value: z.number().finite(),
  unit: z.enum(["engine", "thermal"]),
});

export const SettingResultSchema = SettingSchema.extend({
  result: z.boolean(),
});

export const SettingsPutResponseSchema = z.object({
  msg: z.string().optional(),
  results: z.array(SettingResultSchema),
});

export const SettingsGetResponseSchema = z.object({
  msg: z.string().optional(),
  data: z.object({
    engine: z.string().nullable().optional(),
    thermal: z.string().nullable().optional(),
  }),
});

export const VersionsSchema = z.object({
  startup: z.string(),
  backend: z.string(),
  configer: z.string(),
  frontend: z.string(),
});

export type Setting = z.infer<typeof SettingSchema>;
export type SettingResult = z.infer<typeof SettingResultSchema>;
export type SettingsPutResponse = z.infer<typeof SettingsPutResponseSchema>;
export type SettingsGetResponse = z.infer<typeof SettingsGetResponseSchema>;
