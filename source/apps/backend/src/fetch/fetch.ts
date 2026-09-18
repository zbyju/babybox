import axios from "axios";

export type HttpResult = {
  status: number;
  data: unknown;
};

export async function fetchFromUrl(
  url: string,
  timeout = 5000
): Promise<HttpResult> {
  const response = await axios.get(url, { timeout });
  return { status: response.status, data: response.data };
}
