import { z } from "zod";

export { z };

export const configErrorSchema = z.object({
  path: z.string(),
  msg: z.string(),
});

export const settingSchema = z.object({
  index: z.number().int(),
  value: z.number().finite(),
  unit: z.enum(["engine", "thermal"]),
});
export const settingsResultSchema = settingSchema.extend({
  result: z.boolean(),
});
export type Setting = z.infer<typeof settingSchema>;
export type SettingResult = z.infer<typeof settingsResultSchema>;

export const versionsSchema = z.object({
  backend: z.string(),
  configer: z.string(),
  frontend: z.string(),
  startup: z.string(),
});
export type Versions = z.infer<typeof versionsSchema>;

export const startupLastSchema = z.object({
  step: z.string(),
  ok: z.boolean(),
  message: z.string(),
  at: z.string(),
  node: z.string(),
  pnpm: z.string(),
  bun: z.string(),
});
export type StartupLast = z.infer<typeof startupLastSchema>;

export function parseStartupLast(text: string): StartupLast | null {
  try {
    const raw: unknown = JSON.parse(text);
    const parsed = startupLastSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const portSchema = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^[0-9]+$/)
      .transform(Number),
  ])
  .pipe(z.number().int().min(1).max(65535));

export function bindingPort(
  stored: unknown,
  env: unknown,
  fallback: number
): number {
  for (const raw of [stored, env]) {
    const parsed = portSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return fallback;
}

export const httpErrorMetadataSchema = z.object({
  status: z.number().int().min(400).max(599).optional().catch(undefined),
  expose: z.literal(true).optional().catch(undefined),
});
