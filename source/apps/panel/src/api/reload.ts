import { backendApi } from "@/api/base";
import { requestJson } from "@/api/http";

/*
 * The backend reads the config from configer inside this call, and its own fetch
 * gives configer 5 s. backend.requestTimeout is 5 s too, so the panel would give up
 * on a slow configer before the backend did and report a failed reload that worked.
 */
const RELOAD_TIMEOUT = 15000;

/** A field the backend read but a listening process cannot change. */
export interface UnappliedField {
  path: string;
  running: string | number;
  stored: string | number;
}

export type ReloadResult =
  | { ok: true; unapplied: UnappliedField[] }
  | { ok: false };

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainValue(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function isUnappliedField(value: unknown): value is UnappliedField {
  return (
    isObject(value) &&
    typeof value.path === "string" &&
    isPlainValue(value.running) &&
    isPlainValue(value.stored)
  );
}

function readUnapplied(body: unknown): UnappliedField[] {
  if (!isObject(body) || !Array.isArray(body.unapplied)) return [];
  return body.unapplied.filter(isUnappliedField);
}

/**
 * Asks the backend to read the config again, so a saved unit IP or `pc.os` takes
 * effect without restarting the process.
 *
 * Never rejects. A failed reload must not strand the maintainer on a page whose
 * panel-tier changes have not taken effect, so the caller reloads the panel either
 * way and only the wording changes.
 *
 * @returns on success the fields the backend could not apply — only
 * `backend.port` and `backend.url` can be in it
 */
export async function reloadBackendConfig(): Promise<ReloadResult> {
  const { baseUrl, isConfigured } = backendApi();
  if (!isConfigured) return { ok: false };

  try {
    const { data } = await requestJson<unknown>(`${baseUrl}/reload`, {
      method: "POST",
      timeout: RELOAD_TIMEOUT,
    });
    return { ok: true, unapplied: readUnapplied(data) };
  } catch {
    return { ok: false };
  }
}
