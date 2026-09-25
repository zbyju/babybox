import { CONFIGER_API_URL } from "./constants.js";
import { fetchFromUrl } from "./fetch.js";

export type ConfigAnswer =
  | { status: 200; msg: string; data: unknown }
  | { status: 408; msg: string };

export async function fetchConfig(): Promise<ConfigAnswer> {
  const url = `${CONFIGER_API_URL}/main`;

  try {
    const data = await fetchFromUrl(url);
    return {
      status: 200,
      msg: "Data fetched successfully.",
      data: data.data,
    };
  } catch (err) {
    return {
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    };
  }
}
