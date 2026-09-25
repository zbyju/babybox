import axios from "axios";

/*
 * axios 0.27 types its CommonJS entry as `{ default }` for an ES module.
 * The same object is module.exports at run time.
 * Back to axios.get when axios 1.x lands.
 */
export function fetchFromUrl(url: string, timeout = 5000): Promise<any> {
  return axios.default.get(url, { timeout });
}
