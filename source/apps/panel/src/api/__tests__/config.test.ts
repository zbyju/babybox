import { defaultConfig } from "@babybox/config-schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

import { saveConfig } from "@/api/config";
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
    fetchMock.mockResolvedValue(answer(200, defaultConfig()));
    const config = defaultConfig();

    expect(await saveConfig(config)).toEqual({ kind: "saved" });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("/config/main");
    expect(options?.method).toBe("PATCH");
    expect(JSON.parse(String(options?.body))).toEqual(config);
  });

  it("hands back one entry per field a 400 named", async () => {
    const errors = [{ path: "units.engine.ip", msg: "must be a string" }];
    fetchMock.mockResolvedValue(
      answer(400, { msg: "Body is not a valid MainConfig", errors }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "fieldValidationFailed",
      errors,
    });
  });

  it("reports a malformed error list as a protocol failure", async () => {
    fetchMock.mockResolvedValue(
      answer(400, { errors: [{ path: "pc.os" }, "nonsense"] }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverOrProtocolFailed",
      status: 400,
    });
  });

  it("says only the status when the refusal body is not JSON", async () => {
    fetchMock.mockResolvedValue(answer(400));

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverOrProtocolFailed",
      status: 400,
    });
  });

  it("reports an unreadable successful response as a protocol failure", async () => {
    fetchMock.mockResolvedValue(answer(200, { msg: "Ok" }));
    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverOrProtocolFailed",
      status: 200,
      msg: "Ok",
    });
  });

  it("preserves the underlying transport rejection", async () => {
    const failure = new Error("network unavailable");
    fetchMock.mockRejectedValue(failure);
    await expect(saveConfig(defaultConfig())).rejects.toBe(failure);
  });

  /* A 500 is a failed write of main.json and carries only configer's own line. */
  it("carries the message of a failed write", async () => {
    fetchMock.mockResolvedValue(
      answer(500, { msg: "cannot write main.json: no space left on device" }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      kind: "serverOrProtocolFailed",
      status: 500,
      msg: "cannot write main.json: no space left on device",
    });
  });
});
