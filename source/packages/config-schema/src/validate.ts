import { z } from "zod";

import type { MainConfig } from "./schema.js";
import { mainConfigSchema } from "./schema.js";

export interface ConfigError {
  path: string;
  msg: string;
}

export type ParseResult =
  | { ok: true; config: MainConfig }
  | { ok: false; errors: ConfigError[] };

/*
 * zod reports the unknown keys of one object as a single issue with a list of keys.
 * A caller wants to point at a field, so each key becomes its own error.
 */
function toConfigErrors(error: z.ZodError): ConfigError[] {
  return error.issues.flatMap((issue) => {
    const path = issue.path.join(".");
    if (issue.code !== z.ZodIssueCode.unrecognized_keys) {
      return [{ path, msg: issue.message }];
    }
    return issue.keys.map((key) => ({
      path: path ? `${path}.${key}` : key,
      msg: "unknown key",
    }));
  });
}

/*
 * Every problem with a value, each with a dotted path, so a caller can point at the
 * field that is wrong. An empty list means the value is a MainConfig.
 */
export function validateMainConfig(config: unknown): ConfigError[] {
  const result = mainConfigSchema.safeParse(config);
  return result.success ? [] : toConfigErrors(result.error);
}

// The one place an unknown value becomes a MainConfig.
export function parseMainConfig(value: unknown): ParseResult {
  const result = mainConfigSchema.safeParse(value);
  if (result.success) return { ok: true, config: result.data };
  return { ok: false, errors: toConfigErrors(result.error) };
}

/*
 * True for a config that follows every rule except that it may carry keys we do not
 * know. For a reader, not for a write: a box whose main.json grew an extra key must
 * still start its panel, while a PUT that adds one is still refused.
 */
export function isMainConfig(value: unknown): value is MainConfig {
  const result = mainConfigSchema.safeParse(value);
  return (
    result.success ||
    result.error.issues.every(
      (issue) => issue.code === z.ZodIssueCode.unrecognized_keys
    )
  );
}
