import type { z } from "zod";

import {
  type FetchWithTimeoutOptions,
  fetchWithTimeout,
} from "@/utils/fetchWithTimeout";

/*
 * A non-2xx response.
 * A timeout, or a request that never reached the backend, rejects with the
 * underlying fetch error instead, so callers can tell the two cases apart.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    statusText: string,
  ) {
    super(`Request failed with status ${status} ${statusText}`);
    this.name = "HttpError";
  }
}

/** A response arrived but its JSON did not match the endpoint contract. */
export class ProtocolError extends Error {
  constructor(readonly status: number) {
    super(`Invalid JSON response (HTTP ${status})`);
    this.name = "ProtocolError";
  }
}

/* Throws HttpError on a non-2xx response, which plain fetch does not do. */
export const request = async (
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> => {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }
  return response;
};

export async function decodeJson<T>(
  response: Response,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ProtocolError(response.status);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ProtocolError(response.status);
  return parsed.data;
}

export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options: FetchWithTimeoutOptions = {},
): Promise<T> {
  return decodeJson(await request(url, options), schema);
}
