import { describe, expect, it } from "vitest";

import type { MainConfig } from "../../types/config.types.js";
import {
  BoundAddress,
  isBackendReadableConfig,
  reloadConfig,
  unappliedFields,
} from "../configReload.js";

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

const bound: BoundAddress = { port: 5000, prefix: "/api/v1" };

function answerWith(config: unknown) {
  return () => Promise.resolve({ status: 200, msg: "ok", data: config });
}

/* What fetchConfig really returns when configer does not answer: no data key. */
function answerWithNothing() {
  return () =>
    Promise.resolve({
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    });
}

describe("isBackendReadableConfig", () => {
  it("accepts a config that has the five fields the backend reads", () => {
    expect(isBackendReadableConfig(storedConfig())).toBe(true);
  });

  it("accepts a value the write path would refuse but the backend never reads", () => {
    const config = storedConfig();
    config.units.requestDelay = 0;
    (config.camera as Record<string, unknown>).cameraType = "something else";

    expect(isBackendReadableConfig(config)).toBe(true);
  });

  it.each([
    [
      "units.engine.ip missing",
      (c: MainConfig) =>
        delete (c.units.engine as Partial<MainConfig["units"]["engine"]>).ip,
    ],
    [
      "units.thermal.ip missing",
      (c: MainConfig) =>
        delete (c.units.thermal as Partial<MainConfig["units"]["thermal"]>).ip,
    ],
    [
      "pc.os missing",
      (c: MainConfig) => delete (c.pc as Partial<MainConfig["pc"]>).os,
    ],
    [
      "backend.port a string",
      (c: MainConfig) =>
        ((c.backend as unknown as Record<string, unknown>).port = "5000"),
    ],
    [
      "backend.url missing",
      (c: MainConfig) =>
        delete (c.backend as Partial<MainConfig["backend"]>).url,
    ],
    [
      "units not an object",
      (c: MainConfig) =>
        ((c as unknown as Record<string, unknown>).units = "nope"),
    ],
  ])("refuses a config with %s", (_name, breakIt) => {
    const config = storedConfig();
    breakIt(config);

    expect(isBackendReadableConfig(config)).toBe(false);
  });

  it.each([[null], [undefined], ["a string"], [[]], [42]])(
    "refuses %p",
    (value) => {
      expect(isBackendReadableConfig(value)).toBe(false);
    }
  );
});

describe("unappliedFields", () => {
  it("finds nothing when the stored address is what the server bound", () => {
    expect(unappliedFields(storedConfig(), bound)).toEqual([]);
  });

  it("names the port with the running and the stored value", () => {
    const config = storedConfig();
    config.backend.port = 5050;

    expect(unappliedFields(config, bound)).toEqual([
      { path: "backend.port", running: 5000, stored: 5050 },
    ]);
  });

  it("names the prefix with the running and the stored value", () => {
    const config = storedConfig();
    config.backend.url = "/api/v2";

    expect(unappliedFields(config, bound)).toEqual([
      { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
    ]);
  });

  /*
   * The prefix the process runs on can come from API_PREFIX, so it is not always
   * the stored one. Comparing the new config against config.backend.url would
   * compare a value to itself and call every change applied.
   */
  it("reports a stored prefix the running process did not take from the config", () => {
    const config = storedConfig();
    config.backend.url = "/api/v2";

    expect(unappliedFields(config, { port: 5000, prefix: "/api/v1" })).toEqual([
      { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
    ]);
  });

  /*
   * index.ts falls back to API_PREFIX when the stored prefix is empty, so a restart
   * would bind the same fallback again. Reporting it would ask for a restart that
   * cannot apply it.
   */
  it("does not report an empty stored prefix the restart could not bind", () => {
    const config = storedConfig();
    config.backend.url = "";

    expect(unappliedFields(config, { port: 5000, prefix: "/api/v1" })).toEqual(
      []
    );
  });

  it("does not report a port the environment bound as a string", () => {
    expect(
      unappliedFields(storedConfig(), { port: "5000", prefix: "/api/v1" })
    ).toEqual([]);
  });
});

describe("reloadConfig", () => {
  it("returns the new config and nothing unapplied", async () => {
    const config = storedConfig();
    config.units.engine.ip = "10.1.1.99";

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({ status: "reloaded", config, unapplied: [] });
  });

  it("fails without a config when configer does not answer", async () => {
    const result = await reloadConfig(answerWithNothing(), bound);

    expect(result.status).toBe("failed");
    expect(result).not.toHaveProperty("config");
  });

  it("fails when fetchConfig throws", async () => {
    const result = await reloadConfig(
      () => Promise.reject(new Error("socket hang up")),
      bound
    );

    expect(result).toEqual({
      status: "failed",
      msg: "configer request threw: socket hang up",
    });
  });

  it("fails when the stored config lost a field the backend reads", async () => {
    const config = storedConfig();
    delete (config.units.engine as Partial<MainConfig["units"]["engine"]>).ip;

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({
      status: "failed",
      msg: "the stored config is missing a field the backend reads",
    });
  });

  it("reloads and reports the address the listening process cannot change", async () => {
    const config = storedConfig();
    config.backend.port = 5050;
    config.backend.url = "/api/v2";

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({
      status: "reloaded",
      config,
      unapplied: [
        { path: "backend.port", running: 5000, stored: 5050 },
        { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
      ],
    });
  });
});
