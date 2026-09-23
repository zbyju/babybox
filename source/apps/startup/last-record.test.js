/* eslint-env jest */
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildRecord,
  collapseMessage,
  commandMessage,
  resolveVersions,
  writeCli,
  writeRecord,
} = require("./last-record");

const WHEN = new Date(2026, 8, 22, 1, 2, 3);

function versions() {
  return { node: "v18.12.1", pnpm: "7.5.0", bun: "1.4.2" };
}

describe("startup last record", () => {
  it("collapses output, drops node_modules frames, and keeps the tail", () => {
    const stack = [
      "boom",
      "    at leftPad (/app/node_modules/left-pad/index.js:1:1)",
      "    at run (/app/src/index.js:2:2)",
    ].join("\n");
    expect(collapseMessage(stack)).toBe("boom at run (/app/src/index.js:2:2)");
    expect(collapseMessage(`  ${"x".repeat(2005)}  `)).toBe("x".repeat(2000));
    expect(commandMessage("schema broke\n", "schema out\n")).toBe(
      "schema broke schema out"
    );
    expect(commandMessage("", "")).toBe("");
  });

  it("uses the supplied versions and does not spawn", () => {
    const spawnSync = () => {
      throw new Error("spawn");
    };
    expect(resolveVersions(versions(), spawnSync, {}, "linux")).toEqual(
      versions()
    );
  });

  it("reads node from this process and pnpm and bun from the probe", () => {
    const spawnSync = (cmd) => {
      if (cmd === "pnpm") {
        return { status: 0, stdout: "7.5.0\nextra\n", stderr: "" };
      }
      if (cmd === "bun") {
        return { status: 1, stdout: "", stderr: "missing\n" };
      }
      throw new Error(`unexpected ${cmd}`);
    };
    expect(resolveVersions(undefined, spawnSync, {}, "linux")).toEqual({
      node: process.version,
      pnpm: "7.5.0",
      bun: "",
    });
  });

  it("writes the record next to the log and a later write replaces it", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-last-"));
    const logPath = path.join(root, "startup.log");
    const filePath = path.join(root, "startup.last.json");
    try {
      const failed = buildRecord(
        "BUILD_SCHEMA",
        false,
        "schema broke",
        WHEN,
        versions()
      );
      writeRecord(logPath, failed);
      expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual(failed);
      writeRecord(
        logPath,
        buildRecord("BUILD_CONFIGER", true, "", WHEN, versions())
      );
      const last = JSON.parse(fs.readFileSync(filePath, "utf8"));
      expect(last.step).toBe("BUILD_CONFIGER");
      expect(last.ok).toBe(true);
      expect(last.message).toBe("");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("still returns when the log parent is not a directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-last-"));
    const parent = path.join(root, "not-a-directory");
    fs.writeFileSync(parent, "file");
    try {
      writeRecord(
        path.join(parent, "startup.log"),
        buildRecord("INSTALL", true, "", WHEN, versions())
      );
      expect(fs.existsSync(path.join(root, "startup.last.json"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes a full record from the command arguments", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-last-"));
    const logPath = path.join(root, "startup.log");
    const spawnSync = () => {
      throw new Error("spawn");
    };
    try {
      const code = writeCli(
        [
          "node",
          "last-record.js",
          "OS_HOLD",
          "true",
          "Krok OS_HOLD. 6.2.9200",
          logPath,
        ],
        { versions: versions(), now: () => WHEN, spawnSync }
      );
      expect(code).toBe(0);
      expect(
        writeCli(["node", "last-record.js", "OS_HOLD", "true", "hi"])
      ).toBe(1);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, "startup.last.json"), "utf8")
        )
      ).toEqual({
        step: "OS_HOLD",
        ok: true,
        message: "Krok OS_HOLD. 6.2.9200",
        at: WHEN.toISOString(),
        node: "v18.12.1",
        pnpm: "7.5.0",
        bun: "1.4.2",
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
