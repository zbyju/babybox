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
  constructor(readonly status: number, statusText: string) {
    super(`Request failed with status ${status} ${statusText}`);
    this.name = "HttpError";
  }
}

export type JsonResponse<T = unknown> = {
  status: number;
  data: T;
};

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

export const requestJson = async <T = unknown>(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<JsonResponse<T>> => {
  const response = await request(url, options);
  return { status: response.status, data: await response.json() };
};
