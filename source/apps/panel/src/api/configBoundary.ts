import { validateMainConfig } from "@babybox/config-schema";
import { z } from "zod";

const unit = z.object({ ip: z.string() });

/** The legacy values required for panel polling and presentation. */
export const panelReadableConfigSchema = z.unknown().transform((raw, ctx) => {
  const errors = validateMainConfig(raw);
  if (errors.length > 0) {
    console.warn("Config file does not match the schema", errors);
  }

  const parsed = readableFields.safeParse(raw);
  if (parsed.success) return parsed.data;

  for (const issue of parsed.error.issues) ctx.addIssue(issue);
  return z.NEVER;
});

const readableFields = z.object({
  app: z.object({
    password: z.string(),
    refreshRequestLimit: z.number().nullish(),
  }),
  babybox: z.object({ name: z.string() }),
  backend: z.object({
    url: z.string(),
    port: z.number(),
    requestTimeout: z.number(),
  }),
  camera: z.object({
    ip: z.string(),
    username: z.string(),
    password: z.string(),
    cameraType: z.string(),
    updateDelay: z.number(),
  }),
  units: z.object({
    engine: unit,
    thermal: unit,
    requestDelay: z.number(),
    warningThreshold: z.number(),
    errorThreshold: z.number(),
    voltage: z.object({
      divider: z.number(),
      multiplier: z.number(),
      addition: z.number(),
    }),
  }),
});
