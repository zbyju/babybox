import {
  CommonDataRequestQuery,
  CommonDataResponse,
  CommonResponse,
  GetUnitSettingsRequest,
  isInstanceOfGetUnitSettingsRequest,
  Setting,
  SettingResult,
} from "../types/request.types";
import { Action, Unit } from "../types/units.types";
import { actionToUrl, unitToIp } from "../utils/url";
import { fetchFromUrl } from "./fetch";

export async function fetchDataCommon(
  unit: Unit,
  query: unknown
): Promise<CommonDataResponse> {
  const { timeout = parseInt(process.env.DEFAULT_FETCH_TIMEOUT) || 5000 } =
    query as CommonDataRequestQuery;

  const url = `http://${
    unit === Unit.Engine
      ? process.env.ENGINE_UNIT_IP
      : process.env.THERMAL_UNIT_IP
  }/get_ram[0]?rn=60`;

  try {
    const data = await fetchFromUrl(url, timeout);
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

export async function fetchSettings(
  query: unknown
): Promise<CommonDataResponse> {
  if (!isInstanceOfGetUnitSettingsRequest(query)) {
    return {
      status: 400,
      msg: "Unit was specified, but it is wrong. Expected values are: 'engine' or 'thermal'.",
    };
  }
  const {
    unit = "both",
    timeout = parseInt(process.env.DEFAULT_FETCH_TIMEOUT) || 5000,
  } = query as GetUnitSettingsRequest;

  const timestamp = new Date().getTime();

  const res: any = { engine: null, thermal: null };

  if (unit === "engine" || unit === "both") {
    const url = `http://${unitToIp(
      Unit.Engine
    )}/get_sys[100]?rn=16&${timestamp}`;

    try {
      const result = await fetchFromUrl(url, timeout);
      res.engine = result.data;
    } catch (err) {
      return {
        status: 500,
        msg: "There was an error when fetching settings from engine unit.",
      };
    }
  }

  if (unit === "thermal" || unit === "both") {
    const url = `http://${unitToIp(
      Unit.Thermal
    )}/get_sys[100]?rn=16&${timestamp}`;

    try {
      const result = await fetchFromUrl(url, timeout);
      res.thermal = result.data;
    } catch (err) {
      return {
        status: 500,
        msg: "There was an error when fetching settings from thermal unit.",
      };
    }
  }

  return {
    status: 200,
    msg: "Successfully fetched settings.",
    data: res,
  };
}

export async function fetchAction(action: Action): Promise<CommonDataResponse> {
  const timeout = parseInt(process.env.DEFAULT_FETCH_TIMEOUT) || 5000;

  const url = actionToUrl(action);

  try {
    const data = await fetchFromUrl(url, timeout);
    return {
      status: 200,
      msg: "Action sent successfully.",
      data: data.data,
    };
  } catch (err) {
    return {
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    };
  }
}

export async function updateWatchdog(): Promise<CommonResponse> {
  try {
    const _ = await fetchFromUrl(
      `http://${process.env.ENGINE_UNIT_IP}/sdscep?sys141=115`
    );
    return {
      status: 200,
      msg: "Successfully updated Watchdog.",
    };
  } catch (err) {
    return {
      status: 500,
      msg: "Watchdog update was not successful.",
    };
  }
}

export async function updateSettings(
  settings: Setting[],
  tryNumber = 5,
  timeout = 5000
): Promise<SettingResult[]> {
  const results = settings.map(async (s: Setting) => {
    const ip = unitToIp(s.unit);
    const timestamp = new Date().getTime();
    let result = false;

    // Try to override settings tryNumber of times
    while (!result && tryNumber > 0) {
      result = await updateSetting(
        `http://${ip}/sdscep?sys141=${s.index}&${timestamp}`,
        `http://${ip}/sdscep?sys140=${s.value}&${timestamp}`,
        `http://${ip}/get_sys[100]?rn=16&${timestamp}`,
        s.index,
        s.value,
        timeout
      );
      --tryNumber;
    }
    return { ...s, result };
  });

  return Promise.all(results);
}

async function updateSetting(
  urlIndex: string,
  urlValue: string,
  urlVerification: string,
  index: number,
  value: number,
  timeout = 5000
): Promise<boolean> {
  // Send value first; then index
  const valueFetch = fetchFromUrl(urlValue, timeout);
  const indexFetch = fetchFromUrl(urlIndex, timeout);
  try {
    const results = await Promise.all([indexFetch, valueFetch]);
    const verification = await fetchFromUrl(urlVerification, timeout);
    const verificationArray = verification.data.split("|");
    return (
      isStatusOk(results[0].status) &&
      isStatusOk(results[1].status) &&
      results[0].data === index &&
      results[1].data === value &&
      verificationArray[index - 100] === value.toString()
    );
  } catch (err) {
    return false;
  }
}

function isStatusOk(status: number): boolean {
  return status >= 200 && status < 300;
}
