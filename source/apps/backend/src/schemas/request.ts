import { z } from "zod";

import { BothUnit, Unit } from "../types/units.types";

export const UnitSchema = z.nativeEnum(Unit);

export const BothUnitSchema = z.nativeEnum(BothUnit);

export const SettingSchema = z.object({
  index: z.number().int(),
  value: z.number().finite(),
  unit: UnitSchema,
});

export const SettingResultSchema = SettingSchema.extend({
  result: z.boolean(),
});

export const PostUnitSettingsRequestBodySchema = z.object({
  settings: z.array(SettingSchema),
  options: z
    .object({
      timeout: z.number().optional(),
    })
    .optional(),
});

export const GetUnitSettingsRequestSchema = z.object({
  unit: BothUnitSchema.optional(),
  timeout: z.unknown().optional(),
});
