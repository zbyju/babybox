import { storeToRefs } from "pinia";

import { useConfigStore } from "@/pinia/configStore";

export const CONFIGER_API_URL = "http://localhost:5001/api/v1/config";

/* configer runs on the same machine, so this only has to cover a slow boot. */
export const CONFIGER_TIMEOUT = 10000;

const DEFAULT_REQUEST_TIMEOUT = 5000;

/*
 * Reads the config store, so call it inside a function that runs after Pinia is active,
 * never at module top level.
 */
export function backendApi() {
  const { backend: api } = storeToRefs(useConfigStore());

  return {
    baseUrl: `http://localhost:${api.value.port}${api.value.url}`,
    timeout: api.value.requestTimeout || DEFAULT_REQUEST_TIMEOUT,
    isConfigured: api.value.port !== undefined && api.value.url !== undefined,
  };
}
