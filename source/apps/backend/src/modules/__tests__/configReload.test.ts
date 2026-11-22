import { describe, expect, it } from "vitest";

import type { BoundAddress } from "../configReload.js";
import { reloadConfig, unappliedFields } from "../configReload.js";

function storedConfig() {
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

import { backendReadableConfigSchema } from "../../fetch/readConfig.js";
import type { ConfigAnswer } from "../../fetch/fetchConfig.js";

const accepts = (raw: unknown) =>
  backendReadableConfigSchema.safeParse(raw).success;

function answerWith(config: unknown): () => Promise<ConfigAnswer> {
  return () => Promise.resolve({ status: 200, msg: "ok", data: config });
}

/* What fetchConfig really returns when configer does not answer: no data key. */
function answerWithNothing(): () => Promise<ConfigAnswer> {
  return () =>
    Promise.resolve({
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    });
}

describe("accepts", () => {
  it("retains relay settings and the camera address without making email required", async () => {
    const email = { listener: "disabled", mode: "panel" };
    const config = { ...storedConfig(), email };
    expect(await reloadConfig(answerWith(config), bound)).toMatchObject({
      status: "reloaded",
      config: { email, camera: { ip: config.camera.ip } },
    });
    expect(
      await reloadConfig(
        answerWith({ ...config, email: "invalid", camera: null }),
        bound
      )
    ).toMatchObject({ status: "reloaded", config: { email: "invalid" } });
  });

  it("accepts a config that has the five fields the backend reads", () => {
    expect(accepts(storedConfig())).toBe(true);
  });

  it("accepts a value the write path would refuse but the backend never reads", () => {
    const config = storedConfig();
    config.units.requestDelay = 0;
    Reflect.set(config.camera, "cameraType", "something else");

    expect(accepts(config)).toBe(true);
  });

  it.each<[string, (config: ReturnType<typeof storedConfig>) => boolean]>([
    [
      "units.engine.ip missing",
      (c: ReturnType<typeof storedConfig>) =>
        Reflect.deleteProperty(c.units.engine, "ip"),
    ],
    [
      "units.thermal.ip missing",
      (c: ReturnType<typeof storedConfig>) =>
        Reflect.deleteProperty(c.units.thermal, "ip"),
    ],
    [
      "pc.os missing",
      (c: ReturnType<typeof storedConfig>) =>
        Reflect.deleteProperty(c.pc, "os"),
    ],
    [
      "backend.port an invalid string",
      (c: ReturnType<typeof storedConfig>) =>
        Reflect.set(c.backend, "port", "bad"),
    ],
    [
      "backend.url missing",
      (c: ReturnType<typeof storedConfig>) =>
        Reflect.deleteProperty(c.backend, "url"),
    ],
    [
      "units not an object",
      (c: ReturnType<typeof storedConfig>) => Reflect.set(c, "units", "nope"),
    ],
  ])("refuses a config with %s", (_name, breakIt) => {
    const config = storedConfig();
    breakIt(config);

    expect(accepts(config)).toBe(false);
  });

  it.each([[null], [undefined], ["a string"], [[]], [42]])(
    "refuses %p",
    (value) => {
      expect(accepts(value)).toBe(false);
    }
  );
});

describe("unappliedFields", () => {
  it("finds nothing when the stored address is what the server bound", () => {
    expect(
      unappliedFields(backendReadableConfigSchema.parse(storedConfig()), bound)
    ).toEqual([]);
  });

  it("names the port with the running and the stored value", () => {
    const config = storedConfig();
    config.backend.port = 5050;

    expect(
      unappliedFields(backendReadableConfigSchema.parse(config), bound)
    ).toEqual([{ path: "backend.port", running: 5000, stored: 5050 }]);
  });

  it("names the prefix with the running and the stored value", () => {
    const config = storedConfig();
    config.backend.url = "/api/v2";

    expect(
      unappliedFields(backendReadableConfigSchema.parse(config), bound)
    ).toEqual([{ path: "backend.url", running: "/api/v1", stored: "/api/v2" }]);
  });

  /*
   * The prefix the process runs on can come from API_PREFIX, so it is not always
   * the stored one. Comparing the new config against config.backend.url would
   * compare a value to itself and call every change applied.
   */
  it("reports a stored prefix the running process did not take from the config", () => {
    const config = storedConfig();
    config.backend.url = "/api/v2";

    expect(
      unappliedFields(backendReadableConfigSchema.parse(config), {
        port: 5000,
        prefix: "/api/v1",
      })
    ).toEqual([{ path: "backend.url", running: "/api/v1", stored: "/api/v2" }]);
  });

  /*
   * index.ts falls back to API_PREFIX when the stored prefix is empty, so a restart
   * would bind the same fallback again. Reporting it would ask for a restart that
   * cannot apply it.
   */
  it("does not report an empty stored prefix the restart could not bind", () => {
    const config = storedConfig();
    config.backend.url = "";

    expect(
      unappliedFields(backendReadableConfigSchema.parse(config), {
        port: 5000,
        prefix: "/api/v1",
      })
    ).toEqual([]);
  });

  it("does not report a port the environment bound as a string", () => {
    expect(
      unappliedFields(backendReadableConfigSchema.parse(storedConfig()), {
        port: "5000",
        prefix: "/api/v1",
      })
    ).toEqual([]);
  });
});

describe("reloadConfig", () => {
  it("returns the new config and nothing unapplied", async () => {
    const config = storedConfig();
    config.units.engine.ip = "10.1.1.99";

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({
      status: "reloaded",
      config: backendReadableConfigSchema.parse(config),
      unapplied: [],
    });
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
    Reflect.deleteProperty(config.units.engine, "ip");

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({
      status: "failed",
      msg: "the stored config has invalid backend fields: units.engine.ip",
    });
  });

  it("reloads and reports the address the listening process cannot change", async () => {
    const config = storedConfig();
    config.backend.port = 5050;
    config.backend.url = "/api/v2";

    const result = await reloadConfig(answerWith(config), bound);

    expect(result).toEqual({
      status: "reloaded",
      config: backendReadableConfigSchema.parse(config),
      unapplied: [
        { path: "backend.port", running: 5000, stored: 5050 },
        { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
      ],
    });
  });
});
