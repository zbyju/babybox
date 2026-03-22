import { describe, expect, it } from "bun:test";
import { absolutePath, shellCommand } from "../branded";
import { StartupConfigSchema } from "../config";
import { LogEntry } from "../logging";
import { GitPullResult } from "../results";
import { Suggestion } from "../suggestion";

describe("branded types", () => {
  it("creates absolute paths correctly", () => {
    const unixPath = absolutePath("/home/user");
    expect(unixPath).not.toBeNull();
    expect(unixPath as string).toBe("/home/user");

    expect(absolutePath("relative/path")).toBeNull();

    const windowsPath = absolutePath("C:\\Users");
    expect(windowsPath).not.toBeNull();
    expect(windowsPath as string).toBe("C:\\Users");
  });

  it("creates shell commands", () => {
    const cmd = shellCommand("git pull");
    expect(cmd as string).toBe("git pull");
  });
});

describe("result types", () => {
  it("creates git pull results", () => {
    const updated = GitPullResult.updated(5);
    expect(updated.kind).toBe("updated");
    if (updated.kind === "updated") {
      expect(updated.commitsBehind).toBe(5);
    }

    const upToDate = GitPullResult.alreadyUpToDate();
    expect(upToDate.kind).toBe("already_up_to_date");
  });
});

describe("suggestion types", () => {
  it("creates terminal suggestions", () => {
    const suggestion = Suggestion.terminalGlobal(
      shellCommand("git stash"),
      "Ulozte zmeny do stashe",
    );
    expect(suggestion.kind).toBe("terminal");
    expect(suggestion.scope.kind).toBe("global");
  });
});

describe("logging types", () => {
  it("creates log entries", () => {
    const entry = LogEntry.info("startup", "Aplikace spustena");
    expect(entry.level).toBe("info");
    expect(entry.module).toBe("startup");
    expect(entry.message).toBe("Aplikace spustena");
    expect(entry.suggestions).toEqual([]);
  });
});

describe("config validation", () => {
  it("validates config with defaults", () => {
    const result = StartupConfigSchema.safeParse({
      repositoryPath: "/home/babybox",
      distPath: "/home/babybox/dist",
      distBackupPath: "/home/babybox/dist-backup",
      logsPath: "/home/babybox/logs",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxRetries).toBe(5); // default
    }
  });

  it("rejects invalid config", () => {
    const result = StartupConfigSchema.safeParse({
      repositoryPath: "", // invalid: empty
    });
    expect(result.success).toBe(false);
  });
});
