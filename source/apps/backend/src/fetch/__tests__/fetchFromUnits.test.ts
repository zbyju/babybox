import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { setConfig } from "../../state/config";
import type { MainConfig } from "../../types/config.types";

// Mock the fetch module
vi.mock("../fetch", () => ({
  fetchFromUrl: vi.fn(),
}));

import { fetchFromUrl } from "../fetch";
import { fetchDataCommon } from "../fetch-from-units";
import { Unit } from "../../types/units.types";

const mockFetchFromUrl = vi.mocked(fetchFromUrl);

const mockConfig: MainConfig = {
  babybox: { name: "Test Babybox" },
  backend: { url: "/api/v1", port: 3000, requestTimeout: 5000 },
  configer: { url: "/api/v1", port: 3001, requestTimeout: 5000 },
  startup: {},
  units: {
    engine: { ip: "10.1.1.5" },
    thermal: { ip: "10.1.1.6" },
    requestDelay: 2000,
    warningThreshold: 3,
    errorThreshold: 5,
    voltage: { divider: 63, multiplier: 100, addition: 0 },
  },
  camera: {
    ip: "10.1.1.7",
    username: "admin",
    password: "admin",
    updateDelay: 1000,
    cameraType: "dahua",
  },
  pc: { os: "ubuntu" },
  app: { password: "test123" },
};

describe("fetchFromUnits", () => {
  beforeAll(() => {
    setConfig(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchDataCommon", () => {
    it("should fetch engine data and return success response", async () => {
      const mockData = "100|200|300";
      mockFetchFromUrl.mockResolvedValueOnce({
        status: 200,
        data: mockData,
      } as Parameters<typeof mockFetchFromUrl.mockResolvedValueOnce>[0]);

      const result = await fetchDataCommon(Unit.Engine, {});

      expect(result.status).toBe(200);
      expect(result.data).toBe(mockData);
      expect(mockFetchFromUrl).toHaveBeenCalledWith(
        expect.stringContaining("10.1.1.5"),
        expect.any(Number),
      );
    });

    it("should fetch thermal data and use correct IP", async () => {
      const mockData = "50|60|70";
      mockFetchFromUrl.mockResolvedValueOnce({
        status: 200,
        data: mockData,
      } as Parameters<typeof mockFetchFromUrl.mockResolvedValueOnce>[0]);

      const result = await fetchDataCommon(Unit.Thermal, {});

      expect(result.status).toBe(200);
      expect(mockFetchFromUrl).toHaveBeenCalledWith(
        expect.stringContaining("10.1.1.6"),
        expect.any(Number),
      );
    });

    it("should return 408 error on network failure", async () => {
      mockFetchFromUrl.mockRejectedValueOnce(new Error("Request timed out"));

      const result = await fetchDataCommon(Unit.Engine, {});

      expect(result.status).toBe(408);
      expect(result.msg).toContain("timedout");
    });

    it("should use custom timeout from query", async () => {
      mockFetchFromUrl.mockResolvedValueOnce({
        status: 200,
        data: "1|2|3",
      } as Parameters<typeof mockFetchFromUrl.mockResolvedValueOnce>[0]);

      await fetchDataCommon(Unit.Engine, { timeout: 10000 });

      expect(mockFetchFromUrl).toHaveBeenCalledWith(expect.any(String), 10000);
    });
  });
});
