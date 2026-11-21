import { z } from "zod";

import { backendApi } from "@/api/base";
import { request, requestJson } from "@/api/http";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import type { SettingsToSend } from "@/types/settings/manager.types";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const unitDataSchema = z.object({ data: z.string() });

const unitSettingsSchema = z.object({
  data: z.object({ engine: z.string(), thermal: z.string() }),
});

const settingsResultSchema = z.object({
  unit: z.enum(["engine", "thermal"]),
  index: z.number(),
  value: z.number(),
  result: z.boolean(),
});

const settingsResponseSchema = z.object({ results: z.array(z.unknown()) });

export type SettingsSendResult = z.infer<typeof settingsResultSchema>;

export function readUnitSettings(body: unknown) {
  const parsed = unitSettingsSchema.safeParse(body);
  if (!parsed.success) return undefined;
  const { engine, thermal } = parsed.data.data;
  return { engine: engine.split("|"), thermal: thermal.split("|") };
}

export function readSendResults(body: unknown): SettingsSendResult[] {
  const { results } = settingsResponseSchema.parse(body);
  return results.flatMap((entry) => {
    const parsed = settingsResultSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

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
    const parsed = unitDataSchema.safeParse(body);
    if (!parsed.success) {
      return Promise.reject(undefined);
    }
    return parsed.data.data.split("|").map((x, i) => {
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

export const getSettings = async () => {
  const { baseUrl, timeout } = backendApi();

  const { status, data } = await requestJson(`${baseUrl}/units/settings`, {
    timeout,
  });
  return { status, data: readUnitSettings(data) };
};

export const sendSettings = async (settings: SettingsToSend[]) => {
  const { baseUrl } = backendApi();

  /*
   * Not the configured request timeout:
   * the backend retries each setting against the units up to ten times,
   * so a write can take far longer than a read.
   */
  const { status, data } = await requestJson(`${baseUrl}/units/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
    timeout: 60000,
  });
  return { status, data: readSendResults(data) };
};
