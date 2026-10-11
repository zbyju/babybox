import { defaultConfig } from "@babybox/config-schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

import { saveConfig } from "@/api/config";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const fetchMock = vi.mocked(fetchWithTimeout);

/* Only the three members saveConfig touches; jsdom's Response is not needed. */
function answer(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      body === undefined
        ? Promise.reject(new SyntaxError("Unexpected token"))
        : Promise.resolve(body),
  } as unknown as Response;
}

describe("saveConfig", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("PATCHes the whole config and reports it written", async () => {
    fetchMock.mockResolvedValue(answer(200, { msg: "Ok" }));
    const config = defaultConfig();

    expect(await saveConfig(config)).toEqual({ ok: true });

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
      ok: false,
      status: 400,
      errors,
      msg: "Body is not a valid MainConfig",
    });
  });

  it("drops an error entry that is not a path and a message", async () => {
    fetchMock.mockResolvedValue(
      answer(400, { errors: [{ path: "pc.os" }, "nonsense"] }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      ok: false,
      status: 400,
      errors: [],
    });
  });

  it("says only the status when the refusal body is not JSON", async () => {
    fetchMock.mockResolvedValue(answer(400));

    expect(await saveConfig(defaultConfig())).toEqual({
      ok: false,
      status: 400,
      errors: [],
    });
  });

  /* A 500 is a failed write of main.json and carries only configer's own line. */
  it("carries the message of a failed write", async () => {
    fetchMock.mockResolvedValue(
      answer(500, { msg: "cannot write main.json: no space left on device" }),
    );

    expect(await saveConfig(defaultConfig())).toEqual({
      ok: false,
      status: 500,
      errors: [],
      msg: "cannot write main.json: no space left on device",
    });
  });
});
