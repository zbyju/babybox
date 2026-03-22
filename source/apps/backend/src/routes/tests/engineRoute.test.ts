import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import express from "express";
import { setConfig } from "../../state/config";
import type { MainConfig } from "../../types/config.types";

// Mock the fetch module
vi.mock("../../fetch/fetch-from-units", () => ({
  fetchDataCommon: vi.fn(),
  updateWatchdog: vi.fn(),
}));

import { fetchDataCommon, updateWatchdog } from "../../fetch/fetch-from-units";
import { router } from "../engine-route";

const mockFetchDataCommon = vi.mocked(fetchDataCommon);
const mockUpdateWatchdog = vi.mocked(updateWatchdog);

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

async function makeRequest(
  app: express.Application,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    const response = await fetch(`http://localhost:${port}${path}`, fetchOptions);
    const responseBody = await response.json();
    return { status: response.status, body: responseBody };
  } finally {
    server.close();
  }
}

describe("Engine Route", () => {
  let app: express.Application;

  beforeAll(() => {
    setConfig(mockConfig);
    app = express();
    app.use(express.json());
    app.use("/api/v1/engine", router);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /data", () => {
    it("should return 200 with data on success", async () => {
      mockFetchDataCommon.mockResolvedValueOnce({
        status: 200,
        msg: "Data fetched successfully.",
        data: "100|200|300",
      });

      const { status, body } = await makeRequest(app, "GET", "/api/v1/engine/data");

      expect(status).toBe(200);
      expect(body).toMatchObject({ success: true, data: "100|200|300" });
    });

    it("should return error status on hardware failure", async () => {
      mockFetchDataCommon.mockResolvedValueOnce({
        status: 408,
        msg: "Request timedout.",
      });

      const { status, body } = await makeRequest(app, "GET", "/api/v1/engine/data");

      expect(status).toBe(408);
      expect(body).toMatchObject({ success: false });
    });
  });

  describe("PUT /watchdog", () => {
    it("should return 200 on successful watchdog update", async () => {
      mockUpdateWatchdog.mockResolvedValueOnce({
        status: 200,
        msg: "Successfully updated Watchdog.",
      });

      const { status, body } = await makeRequest(app, "PUT", "/api/v1/engine/watchdog");

      expect(status).toBe(200);
      expect(body).toMatchObject({ success: true });
    });

    it("should return error status on watchdog failure", async () => {
      mockUpdateWatchdog.mockResolvedValueOnce({
        status: 500,
        msg: "Watchdog update was not successful.",
      });

      const { status, body } = await makeRequest(app, "PUT", "/api/v1/engine/watchdog");

      expect(status).toBe(500);
      expect(body).toMatchObject({ success: false });
    });
  });
});
