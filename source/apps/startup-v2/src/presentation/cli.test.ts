import { describe, expect, it } from "bun:test";
import { resolveOS, detectOS, parseOSFromArg } from "./os-detection.js";
import { loadConfig, getLogLevel } from "./config-loader.js";

describe("OS detection", () => {
  it("respects explicit ubuntu flag", () => {
    const os = resolveOS({ ubuntu: true });
    expect(os.kind).toBe("ubuntu");
  });

  it("respects explicit windows flag", () => {
    const os = resolveOS({ windows: true });
    expect(os.kind).toBe("windows");
  });

  it("respects explicit mac flag", () => {
    const os = resolveOS({ mac: true });
    expect(os.kind).toBe("mac");
  });

  it("auto-detects when no flag set", () => {
    const os = resolveOS({});
    // Should be one of the valid OS kinds
    expect(["ubuntu", "windows", "mac"]).toContain(os.kind);
  });

  it("detectOS returns valid OS", () => {
    const os = detectOS();
    expect(["ubuntu", "windows", "mac"]).toContain(os.kind);
  });

  it("parseOSFromArg handles ubuntu variants", () => {
    expect(parseOSFromArg("ubuntu")?.kind).toBe("ubuntu");
    expect(parseOSFromArg("linux")?.kind).toBe("ubuntu");
    expect(parseOSFromArg("UBUNTU")?.kind).toBe("ubuntu");
  });

  it("parseOSFromArg handles windows variants", () => {
    expect(parseOSFromArg("windows")?.kind).toBe("windows");
    expect(parseOSFromArg("win")?.kind).toBe("windows");
    expect(parseOSFromArg("WINDOWS")?.kind).toBe("windows");
  });

  it("parseOSFromArg handles mac variants", () => {
    expect(parseOSFromArg("mac")?.kind).toBe("mac");
    expect(parseOSFromArg("macos")?.kind).toBe("mac");
    expect(parseOSFromArg("darwin")?.kind).toBe("mac");
  });

  it("parseOSFromArg returns null for invalid input", () => {
    expect(parseOSFromArg(undefined)).toBeNull();
    expect(parseOSFromArg("")).toBeNull();
    expect(parseOSFromArg("invalid")).toBeNull();
  });
});

describe("config loading", () => {
  it("loads default config", () => {
    const config = loadConfig();
    expect(config.repositoryPath).toBeTruthy();
    expect(config.maxRetries).toBe(5);
  });

  it("config has required paths", () => {
    const config = loadConfig();
    expect(config.distPath).toContain("dist");
    expect(config.distBackupPath).toContain("dist-backup");
    expect(config.logsPath).toContain("logs");
  });

  it("getLogLevel returns valid level", () => {
    const level = getLogLevel();
    expect(["debug", "info", "warn", "error"]).toContain(level);
  });
});
