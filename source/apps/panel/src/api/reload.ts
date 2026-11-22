import {
  reloadResponseSchema,
  type UnappliedField,
} from "@babybox/config-schema";

import { backendApi } from "@/api/base";
import { requestJson } from "@/api/http";

/*
 * The backend reads the config from configer inside this call, and its own fetch
 * gives configer 5 s. backend.requestTimeout is 5 s too, so the panel would give up
 * on a slow configer before the backend did and report a failed reload that worked.
 */
const RELOAD_TIMEOUT = 15000;

export type ReloadResult =
  | { ok: true; unapplied: UnappliedField[] }
  | { ok: false };

/**
 * Asks the backend to read the config again, so a saved unit IP or `pc.os` takes
 * effect without restarting the process.
 *
 * Never rejects. A failed reload must not strand the maintainer on a page whose
 * panel-tier changes have not taken effect, so the caller reloads the panel either
 * way and only the wording changes.
 *
 * @returns on success the fields the backend could not apply — only
 * `backend.port` and `backend.url` can be in it. A 200 whose body the panel cannot
 * read is `ok: false`, the same as no answer at all.
 */
export async function reloadBackendConfig(): Promise<ReloadResult> {
  const { baseUrl, isConfigured } = backendApi();
  if (!isConfigured) return { ok: false };

  try {
    const { unapplied } = await requestJson(
      `${baseUrl}/reload`,
      reloadResponseSchema,
      {
        method: "POST",
        timeout: RELOAD_TIMEOUT,
      },
    );
    return { ok: true, unapplied };
  } catch {
    return { ok: false };
  }
}
