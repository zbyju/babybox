import { settingsResultSchema, type Setting, type SettingResult } from "@babybox/config-schema";
import { z } from "zod";

const pipeValues = z.string().transform((value) => value.split("|"));

export const unitDataSchema = z.object({
  data: pipeValues.transform((values) => values.map((value, index) => ({ index, value }))),
});

export const settingsResponseSchemas = {
  both: z.object({ data: z.object({ engine: pipeValues, thermal: pipeValues }) }),
  engine: z.object({ data: z.object({ engine: pipeValues, thermal: z.null() }) }),
  thermal: z.object({ data: z.object({ engine: z.null(), thermal: pipeValues }) }),
};

export const settingsAcknowledgementsSchema = z.object({
  results: z.array(settingsResultSchema),
});

export type SettingsSave =
  | { kind: "confirmed"; results: SettingResult[] }
  | { kind: "rejected"; results: SettingResult[] }
  | { kind: "unconfirmed" };

function settingKey({ unit, index }: Setting): string {
  return `${unit}:${index}`;
}

export function reconcileSettings(
  submitted: readonly Setting[],
  results: SettingResult[],
  status: number,
): SettingsSave {
  const outstanding = new Map(submitted.map((entry) => [settingKey(entry), entry.value]));
  if (submitted.length === 0 || outstanding.size !== submitted.length) {
    return { kind: "unconfirmed" };
  }
  for (const result of results) {
    const key = settingKey(result);
    if (outstanding.get(key) !== result.value) return { kind: "unconfirmed" };
    outstanding.delete(key);
  }
  if (outstanding.size > 0) return { kind: "unconfirmed" };

  const confirmed = results.filter((result) => result.result).length;
  if (confirmed === results.length && status === 200) return { kind: "confirmed", results };
  if (confirmed === 0 && status === 500) return { kind: "rejected", results };
  if (confirmed > 0 && confirmed < results.length && status === 206) {
    return { kind: "rejected", results };
  }
  return { kind: "unconfirmed" };
}
