import { CONFIGER_API_URL } from "./constants";
import { fetchFromUrl } from "./fetch";

export type FetchConfigSuccess = {
  ok: true;
  status: 200;
  msg: string;
  data: unknown;
};

export type FetchConfigFailure = {
  ok: false;
  status: 408;
  msg: string;
};

export type FetchConfigResult = FetchConfigSuccess | FetchConfigFailure;

export async function fetchConfig(): Promise<FetchConfigResult> {
  const url = `${CONFIGER_API_URL}/main`;

  try {
    const result = await fetchFromUrl(url);
    return {
      ok: true,
      status: 200,
      msg: "Data fetched successfully.",
      data: result.data,
    };
  } catch {
    return {
      ok: false,
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    };
  }
}
