import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/base", () => ({ backendApi: vi.fn() }));
vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

import { backendApi } from "@/api/base";
import { HttpError, ProtocolError } from "@/api/http";
import { getData, getSettings, sendSettings } from "@/api/units";
import type { SettingsToSend } from "@/types/settings/manager.types";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const fetchMock = vi.mocked(fetchWithTimeout);
const baseUrl = "http://localhost:5000/api/v1";

function answer(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(backendApi).mockReturnValue({ baseUrl, timeout: 5000, isConfigured: true });
});

describe("unit reads", () => {
  it("splits a unit answer into indexed values", async () => {
    answer({ data: "12|0" });
    expect(await getData(`${baseUrl}/engine/data`)).toEqual([
      { index: 0, value: "12" },
      { index: 1, value: "0" },
    ]);
  });

  it.each([{}, { data: 12 }, { data: null }, "12|0", null])(
    "rejects a malformed unit response %p",
    async (body) => {
      answer(body);
      await expect(getData(`${baseUrl}/engine/data`)).rejects.toBeInstanceOf(ProtocolError);
    },
  );

  it("splits both settings lists by default", async () => {
    answer({ data: { engine: "1|2", thermal: "3|4" } });
    expect(await getSettings()).toEqual({ engine: ["1", "2"], thermal: ["3", "4"] });
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/units/settings`, { timeout: 5000 });
  });

  it.each(["engine", "thermal"] as const)("leaves the unrequested unit null for %s", async (unit) => {
    const body = unit === "engine" ? { engine: "1|2", thermal: null } : { engine: null, thermal: "1|2" };
    answer({ data: body });
    expect(await getSettings(unit)).toEqual({ ...body, [unit]: ["1", "2"] });
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/units/settings?unit=${unit}`, { timeout: 5000 });
  });

  it("rejects a missing side when both units were requested", async () => {
    answer({ data: { engine: "1|2", thermal: null } });
    await expect(getSettings()).rejects.toBeInstanceOf(ProtocolError);
  });

  it("retains HTTP errors for settings reads", async () => {
    answer({ msg: "Could not fetch settings" }, 500);
    await expect(getSettings()).rejects.toBeInstanceOf(HttpError);
  });
});

describe("settings acknowledgements", () => {
  const engine: SettingsToSend = { unit: "engine", index: 108, value: 2 };
  const thermal: SettingsToSend = { unit: "thermal", index: 100, value: 2 };
  const engineAck = { ...engine, result: true };
  const thermalAck = { ...thermal, result: true };
  const submitted = [engine, thermal];

  it("confirms reordered acknowledgements for all submitted writes", async () => {
    const results = [thermalAck, engineAck];
    answer({ results });
    expect(await sendSettings(submitted)).toEqual({ kind: "confirmed", results });
  });

  it("confirms an intentional one-unit write", async () => {
    const results = [engineAck];
    answer({ results });
    expect(await sendSettings([engine])).toEqual({ kind: "confirmed", results });
  });

  it.each([
    ["missing array", {}],
    ["empty array", { results: [] }],
    ["missing second acknowledgement", { results: [engineAck] }],
    ["duplicate", { results: [engineAck, engineAck] }],
    ["extra duplicate", { results: [engineAck, thermalAck, thermalAck] }],
    ["wrong value", { results: [engineAck, { ...thermalAck, value: 3 }] }],
    ["wrong index", { results: [engineAck, { ...thermalAck, index: 101 }] }],
    ["wrong unit", { results: [engineAck, { ...thermalAck, unit: "engine" }] }],
    ["malformed acknowledgement", { results: [engineAck, { ...thermalAck, result: "yes" }] }],
  ])("cannot confirm a response with %s", async (_, body) => {
    answer(body);
    expect(await sendSettings(submitted)).toEqual({ kind: "unconfirmed" });
  });

  it("reports an explicit rejection when the device results and status agree", async () => {
    const results = [engineAck, { ...thermalAck, result: false }];
    answer({ results }, 206);
    expect(await sendSettings(submitted)).toEqual({ kind: "rejected", results });
    answer({ results });
    expect(await sendSettings(submitted)).toEqual({ kind: "unconfirmed" });
  });

  it("retains a completely rejected result under HTTP 500", async () => {
    const results = [{ ...engineAck, result: false }];
    answer({ results }, 500);
    expect(await sendSettings([engine])).toEqual({ kind: "rejected", results });
  });

  it("keeps a transport failure distinguishable from a malformed response", async () => {
    const offline = new Error("offline");
    fetchMock.mockRejectedValue(offline);
    await expect(sendSettings(submitted)).rejects.toBe(offline);
  });
});
