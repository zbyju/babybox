import type { AxiosResponse } from "axios";
import axios from "axios";

export function fetchFromUrl(
  url: string,
  timeout = 5000
): Promise<AxiosResponse<unknown>> {
  return axios.get(url, { timeout });
}
