import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/base", () => ({ backendApi: vi.fn() }));
vi.mock("@/api/http", () => ({ requestJson: vi.fn() }));

import { backendApi } from "@/api/base";
import { requestJson } from "@/api/http";
import { reloadBackendConfig } from "@/api/reload";

const backendApiMock = vi.mocked(backendApi);
const requestJsonMock = vi.mocked(requestJson);

const configured = {
  baseUrl: "http://localhost:5000/api/v1",
  timeout: 5000,
  isConfigured: true,
};

describe("reloadBackendConfig", () => {
  beforeEach(() => {
    backendApiMock.mockReset();
    requestJsonMock.mockReset();
    backendApiMock.mockReturnValue(configured);
  });

  it("asks the backend to read the config again", async () => {
    requestJsonMock.mockResolvedValue({ status: 200, data: { unapplied: [] } });

    const result = await reloadBackendConfig();

    expect(result).toEqual({ ok: true, unapplied: [] });
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:5000/api/v1/reload",
    );
    expect(requestJsonMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    });
  });

  it("hands back the fields the backend could not apply", async () => {
    const unapplied = [{ path: "backend.port", running: 5000, stored: 5050 }];
    requestJsonMock.mockResolvedValue({ status: 200, data: { unapplied } });

    expect(await reloadBackendConfig()).toEqual({ ok: true, unapplied });
  });

  /* The store has no backend address yet, so there is nothing to call. */
  it("sends nothing when the backend address is not configured", async () => {
    backendApiMock.mockReturnValue({ ...configured, isConfigured: false });

    expect(await reloadBackendConfig()).toEqual({ ok: false });
    expect(requestJsonMock).not.toHaveBeenCalled();
  });

  it("does not reject when the backend cannot be reached", async () => {
    requestJsonMock.mockRejectedValue(new Error("fetch failed"));

    expect(await reloadBackendConfig()).toEqual({ ok: false });
  });

  it("drops an entry that is not a field the panel can read", async () => {
    requestJsonMock.mockResolvedValue({
      status: 200,
      data: {
        unapplied: [
          { path: "backend.port", running: 5000, stored: 5050 },
          { path: "backend.url", running: {}, stored: "/api/v2" },
          "nonsense",
        ],
      },
    });

    expect(await reloadBackendConfig()).toEqual({
      ok: true,
      unapplied: [{ path: "backend.port", running: 5000, stored: 5050 }],
    });
  });

  /*
   * An empty list means "the backend applied everything", which clears the restart
   * banner. A body we cannot read must not do that.
   */
  it.each([[{}], [{ unapplied: "nope" }], ["not an object"], [null]])(
    "is not ok when the 200 body is %p",
    async (data) => {
      requestJsonMock.mockResolvedValue({ status: 200, data });

      expect(await reloadBackendConfig()).toEqual({ ok: false });
    },
  );
});
