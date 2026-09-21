import {
  cachedRuntimeVersions,
  readCommandVersion,
  runtimeVersions,
  statusBody,
} from "../runtimeVersions";

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
    expect(statusBody(versions)).toEqual({
      msg: "Alive.",
      node: process.version,
      pnpm: "7.5.0",
      bun: "",
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
