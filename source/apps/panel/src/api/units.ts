import { backendApi } from "@/api/base";
import { type JsonResponse, request, requestJson } from "@/api/http";
import {
  type Setting,
  RawUnitSchema,
  SettingsGetResponseSchema,
  SettingsPutResponseSchema,
  UnitDataResponseSchema,
} from "@/schemas/api";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const getStatus = async (): Promise<boolean> => {
  const { baseUrl, timeout } = backendApi();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/status`, { timeout });
    return response.ok;
  } catch (err: unknown) {
    return false;
  }
};

export const parseUnitDataBody = (
  body: unknown,
): RawEngineUnit | RawThermalUnit | undefined => {
  const parsed = UnitDataResponseSchema.safeParse(body);
  if (!parsed.success) return undefined;
  const fields = parsed.data.data.split("|").map((value, index) => ({
    index,
    value,
  }));
  const raw = RawUnitSchema.safeParse(fields);
  return raw.success ? raw.data : undefined;
};

export const getData = async (
  url: string,
  timeout = 5000,
): Promise<RawEngineUnit | RawThermalUnit | undefined> => {
  try {
    const { data: body } = await requestJson(url, { timeout });
    return parseUnitDataBody(body);
  } catch (err: unknown) {
    return undefined;
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
  } catch (err: unknown) {
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

export const getSettings = (): Promise<JsonResponse<unknown>> => {
  const { baseUrl, timeout } = backendApi();

  return requestJson(`${baseUrl}/units/settings`, { timeout });
};

export const parseSettingsGetResponse = (body: unknown) =>
  SettingsGetResponseSchema.safeParse(body);

export const sendSettings = (
  data: Setting[],
): Promise<JsonResponse<unknown>> => {
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

export const parseSettingsPutResponse = (body: unknown) =>
  SettingsPutResponseSchema.safeParse(body);
