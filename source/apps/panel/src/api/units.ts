import type { z } from "zod";

import { backendApi } from "@/api/base";
import { decodeJson, request, requestJson } from "@/api/http";
import {
  reconcileSettings,
  settingsAcknowledgementsSchema,
  settingsResponseSchemas,
  unitDataSchema,
  type SettingsSave,
} from "@/api/unitsBoundary";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import type { SettingsToSend } from "@/types/settings/manager.types";
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
  const { data } = await requestJson(url, unitDataSchema, { timeout });
  return data;
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

type SettingsUnit = keyof typeof settingsResponseSchemas;
export type SettingsRead<U extends SettingsUnit> = z.infer<
  (typeof settingsResponseSchemas)[U]
>["data"];

export function getSettings(): Promise<SettingsRead<"both">>;
export function getSettings<U extends SettingsUnit>(
  unit: U,
): Promise<SettingsRead<U>>;
export async function getSettings(
  unit: SettingsUnit = "both",
): Promise<SettingsRead<SettingsUnit>> {
  const { baseUrl, timeout } = backendApi();
  const url = `${baseUrl}/units/settings`;
  switch (unit) {
    case "both":
      return (await requestJson(url, settingsResponseSchemas.both, { timeout }))
        .data;
    case "engine":
      return (
        await requestJson(
          `${url}?unit=engine`,
          settingsResponseSchemas.engine,
          { timeout },
        )
      ).data;
    case "thermal":
      return (
        await requestJson(
          `${url}?unit=thermal`,
          settingsResponseSchemas.thermal,
          { timeout },
        )
      ).data;
    default:
      return unit satisfies never;
  }
}

export async function sendSettings(
  data: SettingsToSend[],
): Promise<SettingsSave> {
  const { baseUrl } = backendApi();
  // The backend retries each setting against the units up to ten times.
  const response = await fetchWithTimeout(`${baseUrl}/units/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: data }),
    timeout: 60000,
  });
  try {
    const { results } = await decodeJson(
      response,
      settingsAcknowledgementsSchema,
    );
    return reconcileSettings(data, results, response.status);
  } catch {
    return { kind: "unconfirmed" };
  }
}
