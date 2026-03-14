import { wait } from "../utils/wait.js";
import { fetchFromUrl } from "./fetch.js";

export async function fetchConfig(): Promise<{ status: number; msg: string; data?: unknown }> {
  const url = "http://localhost:3001/api/v1/config/main";

  try {
    await wait(2000);
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
