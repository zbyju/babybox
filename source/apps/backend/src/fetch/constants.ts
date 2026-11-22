import { z } from "../boundary.js";

export const CONFIGER_API_URL = "http://localhost:5001/api/v1/config";

/*
 * Read the env var on every call, not once at import time,
 * because dotenv.config() runs later, during startup.
 */
const timeoutSchema = z
  .string()
  .trim()
  .regex(/^[0-9]+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(2147483647));

export function defaultFetchTimeout(): number {
  const parsed = timeoutSchema.safeParse(process.env["DEFAULT_FETCH_TIMEOUT"]);
  return parsed.success ? parsed.data : 5000;
}
