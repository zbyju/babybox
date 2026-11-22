import { defaultConfig } from "@babybox/config-schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

import { getConfig, saveConfig } from "@/api/config";
import { HttpError, ProtocolError } from "@/api/http";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const fetchMock = vi.mocked(fetchWithTimeout);

function answer(status: number, body?: unknown): Response {
  return new Response(JSON.stringify(body) ?? "", { status });
}

describe("saveConfig", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("PATCHes the whole config and reports it written", async () => {
    const config = defaultConfig();
    fetchMock.mockResolvedValue(answer(200, config));

    expect(await saveConfig(config)).toEqual({ kind: "saved" });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("/config/main");
    expect(options?.method).toBe("PATCH");
    const body = options?.body;
    if (typeof body !== "string") throw new Error("Expected a JSON request");
    const sent: unknown = JSON.parse(body);
    expect(sent).toEqual(config);
  });

  it("does not confirm a successful HTTP status without a saved config", async () => {
    fetchMock.mockResolvedValue(answer(200, { msg: "Ok" }));
    expect(await saveConfig(defaultConfig())).toEqual({ kind: "protocolError" });
  });

  it("hands back one entry per field a 400 named", async () => {
    const errors = [{ path: "units.engine.ip", msg: "must be a string" }];
    fetchMock.mockResolvedValue(
      answer(400, { msg: "Body is not a valid MainConfig", errors }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "fieldErrors",
      status: 400,
      errors,
    });
  });

  it("treats a malformed field-error array as a server error", async () => {
    fetchMock.mockResolvedValue(
      answer(400, { errors: [{ path: "pc.os" }, "nonsense"] }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverError",
      status: 400,
    });
  });

  it("says only the status when the refusal body is not JSON", async () => {
    fetchMock.mockResolvedValue(answer(400));

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverError",
      status: 400,
    });
  });

  /* A 500 is a failed write of main.json and carries only configer's own line. */
  it("carries the message of a failed write", async () => {
    fetchMock.mockResolvedValue(
      answer(500, { msg: "cannot write main.json: no space left on device" }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverError",
      status: 500,
      msg: "cannot write main.json: no space left on device",
    });
  });
});

describe("getConfig", () => {
  it("returns the full configuration parsed for the editor", async () => {
    const config = defaultConfig();
    fetchMock.mockResolvedValueOnce(answer(200, config));
    expect(await getConfig()).toEqual({ ok: true, config });
  });

  it("retains strict field errors for a readable legacy config", async () => {
    const config = defaultConfig();
    fetchMock.mockResolvedValueOnce(answer(200, { ...config, app: { ...config.app, refreshRequestLimit: null } }));
    const result = await getConfig();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected a field error");
    expect(result.errors.map(({ path }) => path)).toContain("app.refreshRequestLimit");
  });

  it("distinguishes invalid JSON, HTTP and transport failures", async () => {
    const offline = new Error("offline");
    fetchMock
      .mockResolvedValueOnce(answer(200))
      .mockResolvedValueOnce(answer(503))
      .mockRejectedValueOnce(offline);
    await expect(getConfig()).rejects.toBeInstanceOf(ProtocolError);
    await expect(getConfig()).rejects.toBeInstanceOf(HttpError);
    await expect(getConfig()).rejects.toBe(offline);
  });
});
