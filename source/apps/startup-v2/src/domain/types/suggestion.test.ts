import { describe, expect, it } from "bun:test";
import { Suggestion } from "./suggestion.js";
import { shellCommand, directoryPath } from "./branded.js";

describe("Suggestion.terminalGlobal", () => {
  it("creates a global terminal suggestion", () => {
    const suggestion = Suggestion.terminalGlobal(
      shellCommand("git stash"),
      "Ulozte zmeny do stashe"
    );
    expect(suggestion.kind).toBe("terminal");
    expect(suggestion.scope.kind).toBe("global");
    expect(suggestion.command as string).toBe("git stash");
    expect(suggestion.message).toBe("Ulozte zmeny do stashe");
  });
});

describe("Suggestion.terminalInDirectory", () => {
  it("creates a directory-scoped terminal suggestion", () => {
    const suggestion = Suggestion.terminalInDirectory(
      shellCommand("bun install"),
      directoryPath("/home/babybox"),
      "Nainstalujte zavislosti"
    );
    expect(suggestion.kind).toBe("terminal");
    expect(suggestion.scope.kind).toBe("directory");
    if (suggestion.scope.kind === "directory") {
      expect(suggestion.scope.path as string).toBe("/home/babybox");
    }
    expect(suggestion.message).toBe("Nainstalujte zavislosti");
  });
});

describe("Suggestion.checkNetwork", () => {
  it("creates a network check suggestion", () => {
    const suggestion = Suggestion.checkNetwork("Zkontrolujte sitove pripojeni");
    expect(suggestion.kind).toBe("manual_action");
    expect(suggestion.action.kind).toBe("check_network");
    expect(suggestion.message).toBe("Zkontrolujte sitove pripojeni");
  });
});

describe("Suggestion.checkDiskSpace", () => {
  it("creates a disk space check suggestion", () => {
    const suggestion = Suggestion.checkDiskSpace("Zkontrolujte volne misto na disku");
    expect(suggestion.kind).toBe("manual_action");
    expect(suggestion.action.kind).toBe("check_disk_space");
    expect(suggestion.message).toBe("Zkontrolujte volne misto na disku");
  });
});

describe("Suggestion.restartMachine", () => {
  it("creates a restart suggestion", () => {
    const suggestion = Suggestion.restartMachine("Restartujte pocitac");
    expect(suggestion.kind).toBe("manual_action");
    expect(suggestion.action.kind).toBe("restart_machine");
    expect(suggestion.message).toBe("Restartujte pocitac");
  });
});

describe("Suggestion.checkPermissions", () => {
  it("creates a permissions check suggestion", () => {
    const suggestion = Suggestion.checkPermissions(
      "/home/babybox/dist",
      "Zkontrolujte prava k adresari"
    );
    expect(suggestion.kind).toBe("manual_action");
    expect(suggestion.action.kind).toBe("check_permissions");
    if (suggestion.action.kind === "check_permissions") {
      expect(suggestion.action.path).toBe("/home/babybox/dist");
    }
    expect(suggestion.message).toBe("Zkontrolujte prava k adresari");
  });
});

describe("Suggestion.documentation", () => {
  it("creates a documentation suggestion without URL", () => {
    const suggestion = Suggestion.documentation(
      "git-conflicts",
      "Prectete si dokumentaci o konfliktech"
    );
    expect(suggestion.kind).toBe("documentation");
    expect(suggestion.topic).toBe("git-conflicts");
    expect(suggestion.message).toBe("Prectete si dokumentaci o konfliktech");
    expect(suggestion.url).toBeUndefined();
  });

  it("creates a documentation suggestion with URL", () => {
    const suggestion = Suggestion.documentation(
      "git-conflicts",
      "Prectete si dokumentaci o konfliktech",
      "https://example.com/docs"
    );
    expect(suggestion.kind).toBe("documentation");
    expect(suggestion.url).toBe("https://example.com/docs");
  });
});

describe("Suggestion.contactSupport", () => {
  it("creates a support suggestion with severity", () => {
    const suggestion = Suggestion.contactSupport(
      "critical",
      "build_failed",
      "Kontaktujte podporu"
    );
    expect(suggestion.kind).toBe("contact_support");
    expect(suggestion.severity).toBe("critical");
    expect(suggestion.context).toBe("build_failed");
    expect(suggestion.message).toBe("Kontaktujte podporu");
  });

  it("supports all severity levels", () => {
    const levels = ["low", "medium", "high", "critical"] as const;
    for (const level of levels) {
      const s = Suggestion.contactSupport(level, "ctx", "msg");
      expect(s.severity).toBe(level);
    }
  });
});
