import {
  mainConfigSchema,
  type ConfigError,
  type MainConfig,
} from "@babybox/config-schema";
import { z } from "zod";

import { CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
import { requestJson } from "@/api/http";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

/**
 * The whole config configer is running on, straight from the file.
 *
 * The config page needs all eight sections; the pinia store only holds the five
 * the panel reads. Rejects on a timeout or a non-2xx answer, so the caller can
 * tell a configer outage from a body it cannot use.
 *
 * Do not put the answer into the config store. The panel sets that store once at
 * boot on purpose: re-setting it invalidates every config-dependent computed while
 * the loop is running.
 *
 * @returns the parsed body, unchecked — the caller validates it
 */
export async function getConfig(): Promise<unknown> {
  const { data } = await requestJson(`${CONFIGER_API_URL}/main`, {
    timeout: CONFIGER_TIMEOUT,
  });
  return data;
}

export type SaveResult =
  | { kind: "saved" }
  | { kind: "fieldValidationFailed"; errors: ConfigError[] }
  | { kind: "serverOrProtocolFailed"; status: number; msg?: string };

const fieldFailure = z.object({
  errors: z.array(z.object({ path: z.string(), msg: z.string() })).min(1),
});

const serverFailure = z.object({ msg: z.string() });

async function readBody(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return undefined;
  }
}

/**
 * Writes the config to configer and hands back what it refused.
 *
 * PATCH, not PUT: a PUT merges the body over `base.json`, so a stored key the form
 * draws no row for would go back to its default. A PATCH merges over the config the
 * box is running, so a key the form does not send keeps its value.
 *
 * The body is the whole config, not a diff. configer compares it against the running
 * one and returns early when nothing moved, so a save that changes nothing does not
 * touch the file or rotate `main.json.bak`.
 *
 * Transport failures reject so the caller can report that the write's
 * outcome is unknown.
 */
export async function saveConfig(config: MainConfig): Promise<SaveResult> {
  const response = await fetchWithTimeout(`${CONFIGER_API_URL}/main`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    timeout: CONFIGER_TIMEOUT,
  });

  const body = await readBody(response);
  if (response.ok && mainConfigSchema.safeParse(body).success) {
    return { kind: "saved" };
  }

  if (response.status === 400) {
    const parsed = fieldFailure.safeParse(body);
    if (parsed.success) {
      return { kind: "fieldValidationFailed", errors: parsed.data.errors };
    }
  }

  const parsed = serverFailure.safeParse(body);
  return {
    kind: "serverOrProtocolFailed",
    status: response.status,
    ...(parsed.success ? { msg: parsed.data.msg } : {}),
  };
}
