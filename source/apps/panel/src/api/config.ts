import {
  configErrorSchema,
  mainConfigSchema,
  parseMainConfig,
  versionsSchema,
  type ConfigError,
  type MainConfig,
} from "@babybox/config-schema";
import { z } from "zod";

import { CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
import { panelReadableConfigSchema } from "@/api/configBoundary";
import { decodeJson, requestJson } from "@/api/http";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const strictRead = z.unknown().transform(parseMainConfig);
const configUrl = `${CONFIGER_API_URL}/main`;
const readOptions = { timeout: CONFIGER_TIMEOUT };

export const getConfig = () => requestJson(configUrl, strictRead, readOptions);

export const getPanelConfig = () =>
  requestJson(configUrl, panelReadableConfigSchema, readOptions);

export const getVersions = () =>
  requestJson(`${CONFIGER_API_URL}/version`, versionsSchema, readOptions);

export type SaveResult =
  | { kind: "saved" }
  | { kind: "fieldErrors"; status: 400; errors: ConfigError[] }
  | { kind: "serverError"; status: number; msg?: string }
  | { kind: "protocolError" };

const fieldErrors = z.object({ errors: z.array(configErrorSchema).nonempty() });
const serverError = z.object({ msg: z.string().optional() });

/**
 * PATCH keeps stored fields that a client omits. Only a transport error rejects,
 * because the client cannot know whether the server finished writing the file.
 */
export async function saveConfig(config: MainConfig): Promise<SaveResult> {
  const response = await fetchWithTimeout(configUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    timeout: CONFIGER_TIMEOUT,
  });
  if (response.ok) {
    try {
      await decodeJson(response, mainConfigSchema);
      return { kind: "saved" };
    } catch {
      return { kind: "protocolError" };
    }
  }

  if (response.status === 400) {
    try {
      const { errors } = await decodeJson(response.clone(), fieldErrors);
      return { kind: "fieldErrors", status: 400, errors };
    } catch {
      // Preserve the HTTP status when a field-error envelope is unavailable.
    }
  }

  try {
    const { msg } = await decodeJson(response, serverError);
    return msg === undefined
      ? { kind: "serverError", status: response.status }
      : { kind: "serverError", status: response.status, msg };
  } catch {
    return { kind: "serverError", status: response.status };
  }
}
