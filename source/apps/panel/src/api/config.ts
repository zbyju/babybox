import { CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
import { requestJson } from "@/api/http";

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
  const { data } = await requestJson<unknown>(`${CONFIGER_API_URL}/main`, {
    timeout: CONFIGER_TIMEOUT,
  });
  return data;
}
