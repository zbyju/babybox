import type { AxiosResponse, AxiosStatic } from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axios: AxiosStatic = require("axios");

export function fetchFromUrl(url: string, timeout = 5000): Promise<AxiosResponse> {
  return axios.get(url, { timeout });
}
