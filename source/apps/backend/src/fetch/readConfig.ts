import { pcOsTypes, portSchema, z } from "../boundary.js";
import type { ConfigAnswer } from "./fetchConfig.js";

const supportedOs = z.enum(pcOsTypes);
const legacyOs = z.string().transform((value) => {
  const parsed = supportedOs.safeParse(value);
  return parsed.success
    ? { status: "supported" as const, value: parsed.data }
    : { status: "unsupported" as const, value };
});

const unit = z.object({ ip: z.string() });
export const backendReadableConfigSchema = z.object({
  backend: z.object({
    url: z.string(),
    port: z.union([portSchema, z.literal(0)]),
  }),
  pc: z.object({ os: legacyOs }),
  units: z.object({ engine: unit, thermal: unit }),
  // Malformed relay settings must not prevent device monitoring from starting.
  email: z.unknown().optional(),
  camera: unit.optional().catch(undefined),
});

export type BackendReadableConfig = z.infer<typeof backendReadableConfigSchema>;
export type RestartOs = BackendReadableConfig["pc"]["os"];

export async function readConfig(fetchConfig: () => Promise<ConfigAnswer>) {
  let answer: ConfigAnswer;
  try {
    answer = await fetchConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed" as const,
      msg: "configer request threw: " + message,
    };
  }

  if (answer.status === 408)
    return { status: "failed" as const, msg: answer.msg };

  const parsed = backendReadableConfigSchema.safeParse(answer.data);
  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      ({ path }) => path.join(".") || "<root>"
    );
    return {
      status: "failed" as const,
      msg: "the stored config has invalid backend fields: " + fields.join(", "),
    };
  }
  return { status: "loaded" as const, config: parsed.data };
}
