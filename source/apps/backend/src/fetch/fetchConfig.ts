import { wait } from "../utils/wait";
import { fetchFromUrl } from "./fetch";

export async function fetchConfig(): Promise<any> {
  const url = "http://localhost:5001/api/v1/config/main";

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
