import { backendApi } from "@/api/base";
import { type JsonResponse, request, requestJson } from "@/api/http";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const getStatus = async (): Promise<boolean> => {
  const { baseUrl, timeout } = backendApi();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/status`, { timeout });
    return response.ok;
  } catch (err) {
    return false;
  }
};

export const getData = async (
  url: string,
  timeout = 5000,
): Promise<RawEngineUnit | RawThermalUnit | undefined> => {
  try {
    const { data: body } = await requestJson(url, { timeout });
    return body.data.split("|").map((x: string, i: number) => {
      return { index: i, value: x };
    });
  } catch (err) {
    return Promise.reject(undefined);
  }
};

export const getEngineData = (): Promise<RawEngineUnit | undefined> => {
  const { baseUrl, timeout } = backendApi();

  return getData(`${baseUrl}/engine/data`, timeout);
};

export const getThermalData = (): Promise<RawThermalUnit | undefined> => {
  const { baseUrl, timeout } = backendApi();

  return getData(`${baseUrl}/thermal/data`, timeout);
};

export const updateWatchdog = async (): Promise<boolean> => {
  const { baseUrl, timeout } = backendApi();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/engine/watchdog`, {
      method: "PUT",
      timeout,
    });
    return response.ok;
  } catch (err) {
    return false;
  }
};

/*
 * Not the configured request timeout.
 * The backend runs one job at a time per unit, so an action jumps the queue but
 * still waits for the request already in flight. The longest of those is one
 * settings attempt, four sequential unit requests. Timing out below that would
 * show the operator an error while the doors still open.
 */
const ACTION_TIMEOUT = 60000;

export const openDoors = async (): Promise<void> => {
  const { baseUrl } = backendApi();

  await request(`${baseUrl}/units/actions/openDoors`, {
    timeout: ACTION_TIMEOUT,
  });
};

export const resetBabybox = async (): Promise<void> => {
  const { baseUrl } = backendApi();

  await request(`${baseUrl}/units/actions/openServiceDoors`, {
    timeout: ACTION_TIMEOUT,
  });
};

export const getSettings = (): Promise<JsonResponse> => {
  const { baseUrl, timeout } = backendApi();

  return requestJson(`${baseUrl}/units/settings`, { timeout });
};

export const sendSettings = (data: any[]): Promise<JsonResponse> => {
  const { baseUrl } = backendApi();

  /*
   * Not the configured request timeout:
   * the backend retries each setting against the units up to ten times,
   * so a write can take far longer than a read.
   */
  return requestJson(`${baseUrl}/units/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: data }),
    timeout: 60000,
  });
};
