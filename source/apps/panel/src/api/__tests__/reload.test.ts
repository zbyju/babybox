import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/base", () => ({ backendApi: vi.fn() }));
vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

import { backendApi } from "@/api/base";
import { reloadBackendConfig } from "@/api/reload";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const fetchMock = vi.mocked(fetchWithTimeout);
const configured = {
  baseUrl: "http://localhost:5000/api/v1",
  timeout: 5000,
  isConfigured: true,
};
const port = { path: "backend.port", running: "5000", stored: 5050 };

function answer(data: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(data)));
}

describe("reloadBackendConfig", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(backendApi).mockReturnValue(configured);
  });

  it("asks the backend to reload and accepts a valid empty report", async () => {
    answer({ unapplied: [] });
    expect(await reloadBackendConfig()).toEqual({ ok: true, unapplied: [] });
    expect(fetchMock).toHaveBeenCalledWith(`${configured.baseUrl}/reload`, {
      method: "POST",
      timeout: 15000,
    });
  });

  it("accepts an environment port and a URL change in the report", async () => {
    const unapplied = [
      port,
      { path: "backend.url", running: "/v1", stored: "/v2" },
    ];
    answer({ unapplied });
    expect(await reloadBackendConfig()).toEqual({ ok: true, unapplied });
  });

  it("sends nothing until the backend address is configured", async () => {
    vi.mocked(backendApi).mockReturnValue({
      ...configured,
      isConfigured: false,
    });
    expect(await reloadBackendConfig()).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failure when the backend cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("fetch failed"));
    expect(await reloadBackendConfig()).toEqual({ ok: false });
  });

  it.each([
    {},
    { unapplied: "nope" },
    null,
    { unapplied: [{}] },
    {
      unapplied: [
        port,
        { path: "backend.url", running: {}, stored: "/api/v2" },
      ],
    },
    { unapplied: [{ ...port, stored: "5050" }] },
    { unapplied: [{ ...port, path: "backend.nothing" }] },
  ])("returns failure for an invalid report %p", async (body) => {
    answer(body);
    expect(await reloadBackendConfig()).toEqual({ ok: false });
  });
});
