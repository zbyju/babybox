import { describe, expect, it, vi } from "vitest";

import type { MainConfig } from "../../types/config.types.js";
import { loadBackendConfig } from "../loadConfig.js";

function storedConfig(): MainConfig {
  return {
    babybox: { name: "Praha" },
    backend: { url: "/api/v1", port: 5000, requestTimeout: 5000 },
    configer: { url: "/api/v1", port: 5001, requestTimeout: 5000 },
    units: {
      engine: { ip: "10.1.1.50" },
      thermal: { ip: "10.1.1.51" },
      requestDelay: 1000,
      warningThreshold: 3,
      errorThreshold: 10,
      voltage: { divider: 63, multiplier: 1, addition: 0 },
    },
    camera: {
      ip: "10.1.1.60",
      username: "admin",
      password: "secret",
      updateDelay: 1000,
      cameraType: "dahua",
    },
    pc: { os: "windows" },
    app: { password: "pass" },
    startup: {},
  };
}

describe("loadBackendConfig", () => {
  it("waits for a config with every field the backend reads", async () => {
    const invalid = storedConfig();
    Reflect.deleteProperty(invalid.units.engine, "ip");
    const valid = storedConfig();
    const fetchConfig = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200 as const,
        msg: "ok",
        data: invalid,
      })
      .mockResolvedValueOnce({ status: 200 as const, msg: "ok", data: valid });
    const wait = vi.fn().mockResolvedValue(undefined);
    const onUnavailable = vi.fn();

    const loaded = await loadBackendConfig(fetchConfig, wait, onUnavailable);

    expect(loaded.units.engine.ip).toBe("10.1.1.50");
    expect(fetchConfig).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(5000);
    expect(onUnavailable).toHaveBeenCalledWith(
      1,
      "configer returned a config missing a field the backend reads"
    );
  });
});
