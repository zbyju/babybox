import { settingSchema, z } from "../boundary.js";

export type { Setting, SettingResult } from "../boundary.js";

const timerMs = z.number().int().min(1).max(2147483647);
// Express parses timeout[]=100 as a singleton array. Preserve the legacy
// numeric conversion for that form while rejecting multi-value timeouts.
const queryNumber = z.union([
  z.number(),
  z.string().transform(Number),
  z.tuple([z.string()]).transform(([value]) => Number(value)),
]);
const timeout = queryNumber.pipe(timerMs).optional().catch(undefined);

export const dataQuerySchema = z.object({ timeout });

export const settingsQuerySchema = z.object({
  unit: z.enum(["engine", "thermal", "both"]).default("both"),
  timeout,
});

export const settingsBodySchema = z
  .object({
    settings: z.array(settingSchema),
    options: z
      .object({
        timeout: z.number().finite().positive().optional().catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .transform(({ settings, options }) => ({
    settings,
    timeout: Math.min(options?.timeout ?? 5000, 10000),
  }));

export type CommonResponse = { status: 200 | 400 | 408 | 500; msg: string };

export type DataResponse<T> =
  | { status: 200; msg: string; data: T }
  | { status: 400 | 408 | 500; msg: string; data?: never };
