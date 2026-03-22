import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import express from "express";

// Mock the DbFactory
vi.mock("../../services/config/factory", () => ({
  DbFactory: {
    getMainDb: vi.fn(),
    getVersionDb: vi.fn(),
  },
}));

import { DbFactory } from "../../services/config/factory";
import { configRoute } from "../config-route";

const mockGetMainDb = vi.mocked(DbFactory.getMainDb);
const mockGetVersionDb = vi.mocked(DbFactory.getVersionDb);

const mockMainConfig = {
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

describe("Config Route", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/v1/config", configRoute);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /main", () => {
    it("should return main config", async () => {
      mockGetMainDb.mockResolvedValueOnce({
        data: () => mockMainConfig,
        update: vi.fn(),
      } as unknown as ReturnType<typeof DbFactory.getMainDb> extends Promise<infer T> ? T : never);

      const { status, body } = await makeRequest(app, "GET", "/api/v1/config/main");

      expect(status).toBe(200);
      expect(body).toMatchObject({ babybox: { name: "Test Babybox" } });
    });

    it("should return 500 on database error", async () => {
      mockGetMainDb.mockRejectedValueOnce(new Error("DB error"));

      const { status, body } = await makeRequest(app, "GET", "/api/v1/config/main");

      expect(status).toBe(500);
      expect(body).toMatchObject({ success: false });
    });
  });

  describe("PUT /main", () => {
    it("should update config with valid data", async () => {
      const updatedConfig = { ...mockMainConfig };
      const mockUpdate = vi.fn().mockResolvedValue(updatedConfig);
      mockGetMainDb.mockResolvedValueOnce({
        data: () => mockMainConfig,
        update: mockUpdate,
      } as unknown as ReturnType<typeof DbFactory.getMainDb> extends Promise<infer T> ? T : never);

      const { status } = await makeRequest(app, "PUT", "/api/v1/config/main", mockMainConfig);

      expect(status).toBe(200);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should return 400 on invalid config", async () => {
      const { status, body } = await makeRequest(app, "PUT", "/api/v1/config/main", {
        invalid: "data",
      });

      expect(status).toBe(400);
      expect(body).toMatchObject({ success: false });
    });
  });

  describe("GET /version", () => {
    it("should return version info", async () => {
      const mockVersionData = { version: "1.0.0" };
      mockGetVersionDb.mockResolvedValueOnce({
        data: () => mockVersionData,
      } as unknown as ReturnType<typeof DbFactory.getVersionDb> extends Promise<infer T>
        ? T
        : never);

      const { status, body } = await makeRequest(app, "GET", "/api/v1/config/version");

      expect(status).toBe(200);
      expect(body).toMatchObject({ version: "1.0.0" });
    });
  });
});
