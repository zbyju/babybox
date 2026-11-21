import { z } from "zod";

import { defaultFetchTimeout } from "../fetch/constants.js";
import { Unit } from "./units.types.js";

export const settingSchema = z.object({
  index: z.number().refine(Number.isInteger),
  value: z.number().finite(),
  unit: z.enum(Unit),
});

export const settingsSchema = z.array(settingSchema);

// A settings write can make four requests in sequence. Cap each one so they
// can finish within the unit queue's 60-second deadline.
const writeTimeout = z
  .number()
  .positive()
  .transform((value) => Math.min(value, 10000))
  .catch(5000);

export const settingsBodySchema = z.object({
  settings: settingsSchema,
  options: z.object({ timeout: writeTimeout }).catch({ timeout: 5000 }),
});

// Express delivers query values as strings. Preserve the old whole-number
// bounds so neither Axios nor Node receives a disabled or overflowing timer.
const queryTimeout = z
  .union([z.string(), z.number(), z.tuple([z.string()])])
  .transform(Number)
  .pipe(z.number().int().min(1).max(2147483647))
  .catch(defaultFetchTimeout);

export const dataQuerySchema = z.object({ timeout: queryTimeout });
export const settingsQuerySchema = dataQuerySchema.extend({
  unit: z.enum(["engine", "thermal", "both"]).default("both"),
});

export type Setting = z.infer<typeof settingSchema>;
export type SettingsQuery = z.infer<typeof settingsQuerySchema>;

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

export interface SettingResult extends Setting {
  result: boolean;
}
