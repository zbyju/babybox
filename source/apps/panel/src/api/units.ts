import axios from "axios";

import { backendApi } from "@/api/base";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import { singleFlight } from "@/utils/singleFlight";

export const getStatus = singleFlight(async (): Promise<boolean> => {
  const { baseUrl, timeout } = backendApi();
  try {
    const response = await axios.get(`${baseUrl}/status`, { timeout });
    if (response.status >= 200 && response.status <= 299) {
      return true;
    }
    throw { msg: "Status code not OK" };
  } catch (err) {
    return false;
  }
});

export const getData = async (
  url: string,
  timeout = 5000,
): Promise<RawEngineUnit | RawThermalUnit | undefined> => {
  try {
    const response = await axios.get(url, {
      timeout,
    });
    return response.data.data.split("|").map((x: string, i: number) => {
      return { index: i, value: x };
    });
  } catch (err) {
    return Promise.reject(undefined);
  }
};

export const getEngineData = singleFlight(
  (): Promise<RawEngineUnit | undefined> => {
    const { baseUrl, timeout } = backendApi();

    return getData(`${baseUrl}/engine/data`, timeout);
  },
);

export const getThermalData = singleFlight(
  (): Promise<RawThermalUnit | undefined> => {
    const { baseUrl, timeout } = backendApi();

    return getData(`${baseUrl}/thermal/data`, timeout);
  },
);

export const updateWatchdog = singleFlight(async (): Promise<boolean> => {
  const { baseUrl, timeout } = backendApi();

  try {
    const response = await axios.put(`${baseUrl}/engine/watchdog`, null, {
      timeout,
    });
    if (response.status >= 200 && response.status <= 299) return true;
    else return false;
  } catch (err) {
    return false;
  }
});

/*
 * Not the configured request timeout.
 * The backend runs one job at a time per unit, so an action jumps the queue but
 * still waits for the request already in flight. The longest of those is one
 * settings attempt, four sequential unit requests. Timing out below that would
 * show the operator an error while the doors still open.
 */
const ACTION_TIMEOUT = 60000;

export const openDoors = (): Promise<any> => {
  const { baseUrl } = backendApi();

  return axios.get(`${baseUrl}/units/actions/openDoors`, {
    timeout: ACTION_TIMEOUT,
  });
};

export const resetBabybox = (): Promise<any> => {
  const { baseUrl } = backendApi();

  return axios.get(`${baseUrl}/units/actions/openServiceDoors`, {
    timeout: ACTION_TIMEOUT,
  });
};

export const getSettings = (): Promise<any> => {
  const { baseUrl, timeout } = backendApi();

  return axios.get(`${baseUrl}/units/settings`, { timeout });
};

export const sendSettings = async (data: any[]): Promise<any> => {
  const { baseUrl } = backendApi();

  /*
   * Not the configured request timeout:
   * the backend retries each setting against the units up to ten times,
   * so a write can take far longer than a read.
   */
  const response = await axios.put(
    `${baseUrl}/units/settings`,
    {
      settings: data,
    },
    { timeout: 60000 },
  );

  if (response.status >= 200 && response.status <= 299) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(response);
  }
};
