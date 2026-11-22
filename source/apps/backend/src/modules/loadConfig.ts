import type { ConfigAnswer } from "../fetch/fetchConfig.js";
import {
  backendReadableConfigSchema,
  type BackendReadableConfig,
} from "../types/configBoundary.js";

export const CONFIG_RETRY_DELAY_MS = 5000;

export async function loadBackendConfig(
  fetchConfig: () => Promise<ConfigAnswer>,
  wait: (milliseconds: number) => Promise<unknown>,
  onUnavailable: (attempt: number, reason: string) => void
): Promise<BackendReadableConfig> {
  let attempt = 1;
  while (true) {
    const answer = await fetchConfig();
    const parsed =
      answer.status === 200
        ? backendReadableConfigSchema.safeParse(answer.data)
        : undefined;
    if (parsed?.success) return parsed.data;

    onUnavailable(
      attempt,
      answer.status === 200
        ? "configer returned a config missing a field the backend reads"
        : answer.msg
    );
    await wait(CONFIG_RETRY_DELAY_MS);
    attempt += 1;
  }
}
