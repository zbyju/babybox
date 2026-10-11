import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import {
  cachedRuntimeVersions,
  parseStartupLast,
  readCommandVersion,
  runtimeVersions,
  startupLastFor,
  statusBody,
} from "../runtimeVersions.js";

describe("runtimeVersions", () => {
  it("reports node and the command output", () => {
    const versions = runtimeVersions((command) => {
      if (command === "pnpm") {
        return "7.5.0\n";
      }
      return "";
    });

    expect(versions).toEqual({
      node: process.version,
      pnpm: "7.5.0",
      bun: "",
    });
    expect(statusBody(versions, null)).toEqual({
      msg: "Alive.",
      node: process.version,
      pnpm: "7.5.0",
      bun: "",
      startup: null,
    });
  });

  it("uses an empty string when a command throws", () => {
    const versions = runtimeVersions(() => {
      throw new Error("missing");
    });

    expect(versions.pnpm).toBe("");
    expect(versions.bun).toBe("");
    expect(versions.node).toBe(process.version);
  });

  it("keeps the first line and trims blank output", () => {
    expect(runtimeVersions(() => "1.2.3\nextra").pnpm).toBe("1.2.3");
    expect(runtimeVersions(() => "  \r\n").pnpm).toBe("");
  });

  it("reads a real command and hides a missing one", () => {
    expect(readCommandVersion(process.execPath, ["-v"])).toBe(process.version);
    expect(
      readCommandVersion(process.execPath, [
        "-e",
        "console.error('noise'); process.stdout.write('9.9.9\\n');",
      ])
    ).toBe("9.9.9");
    expect(
      readCommandVersion(process.execPath, ["-e", "process.exit(1)"])
    ).toBe("");
    expect(readCommandVersion("babybox-no-such-binary", ["-v"])).toBe("");
  });

  it("reads host versions once per process", () => {
    const first = cachedRuntimeVersions();

    expect(cachedRuntimeVersions()).toBe(first);
    expect(first.node).toBe(process.version);
    expect(typeof first.pnpm).toBe("string");
    expect(typeof first.bun).toBe("string");
  });
});

const STARTUP_RECORD = {
  step: "BUILD_SCHEMA",
  ok: false,
  message: "schema broke",
  at: "2026-09-22T01:02:03.000Z",
  node: "v18.12.1",
  pnpm: "7.5.0",
  bun: "1.4.2",
};

describe("startup last record", () => {
  it("parseStartupLast accepts a full record, rejects a partial record, and rejects text that is not JSON", () => {
    expect(parseStartupLast(JSON.stringify(STARTUP_RECORD))).toEqual(
      STARTUP_RECORD
    );
    expect(parseStartupLast("{\"step\":\"OS_HOLD\",\"ok\":true}")).toBe(null);
    expect(parseStartupLast("not json")).toBe(null);
  });

  it("startupLastFor reads the record from a configer dist directory and from a deployed dist directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-status-"));
    const logs = path.join(root, "source", "logs");
    fs.mkdirSync(path.join(root, "source", "apps", "startup"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, "source", "apps", "startup", "versions.env"),
      ""
    );
    fs.mkdirSync(logs, { recursive: true });
    fs.writeFileSync(
      path.join(logs, "startup.last.json"),
      `${JSON.stringify(STARTUP_RECORD)}\n`
    );
    try {
      expect(
        startupLastFor(path.join(root, "source", "apps", "configer", "dist"))
      ).toEqual(STARTUP_RECORD);
      expect(startupLastFor(path.join(root, "dist"))).toEqual(STARTUP_RECORD);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("statusBody nests that record", () => {
    expect(
      statusBody(
        { node: "v18.12.1", pnpm: "7.5.0", bun: "" },
        STARTUP_RECORD
      )
    ).toEqual({
      msg: "Alive.",
      node: "v18.12.1",
      pnpm: "7.5.0",
      bun: "",
      startup: STARTUP_RECORD,
    });
  });

  it("startupLastFor returns null when versions.env exists and startup.last.json does not", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-status-"));
    fs.mkdirSync(path.join(root, "apps", "startup"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "startup", "versions.env"), "");
    try {
      expect(startupLastFor(path.join(root, "apps", "backend", "dist"))).toBe(
        null
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("startupLastFor returns null when the file contents are not JSON", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-status-"));
    const logs = path.join(root, "logs");
    fs.mkdirSync(path.join(root, "apps", "startup"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "startup", "versions.env"), "");
    fs.mkdirSync(logs);
    fs.writeFileSync(path.join(logs, "startup.last.json"), "not json");
    try {
      expect(startupLastFor(path.join(root, "apps", "backend", "dist"))).toBe(
        null
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores a record file that is too large", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-status-"));
    const logs = path.join(root, "logs");
    fs.mkdirSync(path.join(root, "apps", "startup"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "startup", "versions.env"), "");
    fs.mkdirSync(logs);
    fs.writeFileSync(
      path.join(logs, "startup.last.json"),
      JSON.stringify({ ...STARTUP_RECORD, message: "m".repeat(20 * 1024) })
    );
    try {
      expect(startupLastFor(path.join(root, "apps", "backend", "dist"))).toBe(
        null
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
