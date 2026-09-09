export const CONFIGER_API_URL = "http://localhost:5001/api/v1/config";

/*
 * Read the env var on every call, not once at import time,
 * because dotenv.config() runs later, during startup.
 */
export function defaultFetchTimeout(): number {
  return parseInt(process.env.DEFAULT_FETCH_TIMEOUT) || 5000;
}
