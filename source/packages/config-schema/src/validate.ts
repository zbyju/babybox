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

export function validateMainConfig(config: unknown): ConfigError[] {
  const result = parseMainConfig(config);
  return result.ok ? [] : result.errors;
}

// The one place an unknown value becomes a MainConfig.
export function parseMainConfig(value: unknown): ParseResult {
  const result = mainConfigSchema.safeParse(value);
  if (result.success) return { ok: true, config: result.data };
  return { ok: false, errors: toConfigErrors(result.error) };
}
