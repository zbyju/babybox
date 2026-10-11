import type { ConfigError, MainConfig } from "@babybox/config-schema";

import { CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
import { requestJson } from "@/api/http";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { isObject } from "@/utils/general";

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

/**
 * What configer did with the config the form sent.
 *
 * A refusal is a resolved result, not a rejection: its field-level errors are the
 * useful part and they belong next to the inputs that caused them.
 *
 * `errors` is filled on a 400. `msg` carries configer's own line, which is the only
 * thing a 500 gives us — that is a failed write of `main.json`, not a rejection.
 */
export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      errors: ConfigError[];
      msg?: string | undefined;
    };

function isConfigError(value: unknown): value is ConfigError {
  return (
    isObject(value) &&
    typeof value["path"] === "string" &&
    typeof value["msg"] === "string"
  );
}

/** The two useful parts of a refusal body. Both are absent when it is not JSON. */
async function readFailure(
  response: Response,
): Promise<{ errors: ConfigError[]; msg?: string | undefined }> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { errors: [] };
  }
  if (!isObject(body)) return { errors: [] };

  return {
    errors: Array.isArray(body["errors"])
      ? body["errors"].filter(isConfigError)
      : [],
    msg: typeof body["msg"] === "string" ? body["msg"] : undefined,
  };
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
 * Rejects only when configer cannot be reached. A 400 resolves as `ok: false` with
 * one `{ path, msg }` per bad field, or an empty list when the body was not the
 * shape we expect. A 500 means the write of `main.json` failed and carries only
 * `msg`; the caller has to say that, not "configer refused it".
 *
 * @example
 * const result = await saveConfig(parsed.config);
 * if (!result.ok) showNextToFields(result.errors);
 */
export async function saveConfig(config: MainConfig): Promise<SaveResult> {
  const response = await fetchWithTimeout(`${CONFIGER_API_URL}/main`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    timeout: CONFIGER_TIMEOUT,
  });

  if (response.ok) return { ok: true };

  return {
    ok: false,
    status: response.status,
    ...(await readFailure(response)),
  };
}
