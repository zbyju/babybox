import { z } from "zod";

/**
 * What axios leaves after it tries JSON.parse on a unit response.
 *
 * A single integer such as a ready-check `0` parses to a number.
 * A RAM or SYS window such as `0|1|2` stays a string.
 */
export const UnitBodySchema = z.union([z.string(), z.number()]);

export type UnitBody = z.infer<typeof UnitBodySchema>;

export function parseUnitBody(data: unknown): UnitBody | undefined {
  const parsed = UnitBodySchema.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

export function asPipeFields(data: unknown): string[] | undefined {
  return typeof data === "string" ? data.split("|") : undefined;
}
