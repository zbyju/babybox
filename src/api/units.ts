import axios from "axios";
import { storeToRefs } from "pinia";

import { useConfigStore } from "@/pinia/configStore";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";

export const getStatus = async (): Promise<any> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/status";
  const timeout = api.value.requestTimeout || 5000;
  try {
    const response = await axios.get(url, { timeout });
    if (response.status >= 200 && response.status <= 299) {
      return { status: true, version: response.data.version };
    }
    return { status: false, version: undefined };
  } catch (err) {
    return { status: false, version: undefined };
  }
};

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

export const getEngineData = (): Promise<RawEngineUnit | undefined> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/engine/data";
  const timeout = api.value.requestTimeout || 5000;

  return getData(url, timeout);
};

export const getThermalData = (): Promise<RawThermalUnit | undefined> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/thermal/data";
  const timeout = api.value.requestTimeout || 5000;

  return getData(url, timeout);
};

export const updateWatchdog = async (): Promise<boolean> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/engine/watchdog";
  const timeout = api.value.requestTimeout || 5000;

  try {
    const response = await axios.put(url, { timeout });
    if (response.status >= 200 && response.status <= 299) return true;
    else return false;
  } catch (err) {
    return false;
  }
};

export const openDoors = (): Promise<any> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/units/actions/openDoors";
  const timeout = api.value.requestTimeout || 5000;

  return axios.get(url, { timeout });
};

export const resetBabybox = (): Promise<any> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/units/actions/openServiceDoors";
  const timeout = api.value.requestTimeout || 5000;

  return axios.get(url, { timeout });
};

export const getSettings = (): Promise<any> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/units/settings";
  const timeout = api.value.requestTimeout || 5000;

  return axios.get(url, { timeout });
};

export const sendSettings = (data: any[]): Promise<any> => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/units/settings";
  const timeout = api.value.requestTimeout || 5000;

  console.log("Sending: ", {
    settings: data,
  });

  return axios.put(
    url,
    {
      settings: data,
    },
    { timeout },
  );
};
