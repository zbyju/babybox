import { z } from "zod";

/*
 * configer owns the full config schema. The backend dist is installed standalone,
 * so it validates only the fields it reads with its own runtime dependency. This
 * keeps malformed values out of a poll loop without rejecting unrelated config
 * fields the backend never consumes.
 */
export const backendReadableConfigSchema = z
  .object({
    backend: z.object({ url: z.string(), port: z.number() }).passthrough(),
    pc: z.object({ os: z.string() }).passthrough(),
    units: z
      .object({
        engine: z.object({ ip: z.string() }).passthrough(),
        thermal: z.object({ ip: z.string() }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export type BackendReadableConfig = z.infer<typeof backendReadableConfigSchema>;
