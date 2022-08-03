import axios from "axios";

export function fetchFromUrl(url: string, timeout = 5000): Promise<any> {
  return axios.get(url, { timeout });
}
