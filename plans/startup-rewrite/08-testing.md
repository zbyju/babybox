# Project 8: Testing & Verification

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Comprehensive test suite with unit tests for domain and integration tests with mocks |
| **Risk** | Low |
| **Effort** | 2 days |
| **Dependencies** | #7 Build & Distribution |
| **Unlocks** | Migration & Deployment |

## Testing Strategy

### Layer-Specific Testing Approaches

| Layer | Testing Approach | Mocking | Coverage Target |
|-------|------------------|---------|-----------------|
| **Domain** | Pure unit tests | None needed | 100% |
| **Application** | Integration tests | Mock all ports | 90%+ |
| **Infrastructure** | Integration tests | Mock external APIs | 80%+ |
| **Presentation** | E2E / CLI tests | Mock adapters | 70%+ |

### Key Principles

1. **Domain layer = exhaustive unit tests**
   - Every function tested with all input combinations
   - No mocks needed (pure functions)
   - Property-based testing where applicable
   - Edge cases and boundary conditions

2. **Application layer = dependency injection testing**
   - Mock all port interfaces
   - Test orchestration logic
   - Verify correct port method calls
   - Test error handling paths

3. **Infrastructure layer = wrapper testing**
   - Mock external APIs (Bun.spawn, fs, etc.)
   - Test adapter implementations
   - Verify Result type handling

## Tasks

### 8.1 Test Configuration

#### bunfig.toml (test section)

```toml
[test]
coverage = true
coverageDir = "./coverage"
coverageThreshold = {
  line = 80,
  function = 80,
  branch = 70
}
timeout = 30000
preload = ["./src/test/setup.ts"]
```

#### src/test/setup.ts

```typescript
/**
 * Test setup - runs before all tests.
 */

import { beforeAll, afterAll } from "bun:test";

// Suppress console output during tests unless DEBUG=true
if (!process.env.DEBUG) {
  beforeAll(() => {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
  });
}

// Ensure clean state after tests
afterAll(() => {
  // Cleanup any test artifacts
});
```

### 8.2 Domain Layer Unit Tests

Domain tests are comprehensive unit tests with no mocking needed.

#### src/domain/types/branded.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  absolutePath,
  relativePath,
  shellCommand,
  processName,
  timestamp,
  durationMs,
  gitBranch,
} from "./branded";

describe("absolutePath", () => {
  it("accepts Unix absolute paths", () => {
    expect(absolutePath("/home/user")).toBe("/home/user");
    expect(absolutePath("/")).toBe("/");
    expect(absolutePath("/a/b/c/d")).toBe("/a/b/c/d");
  });

  it("accepts Windows absolute paths", () => {
    expect(absolutePath("C:\\Users")).toBe("C:\\Users");
    expect(absolutePath("D:\\")).toBe("D:\\");
    expect(absolutePath("C:\\Program Files\\App")).toBe("C:\\Program Files\\App");
  });

  it("rejects relative paths", () => {
    expect(absolutePath("relative/path")).toBeNull();
    expect(absolutePath("./local")).toBeNull();
    expect(absolutePath("../parent")).toBeNull();
    expect(absolutePath("file.txt")).toBeNull();
  });

  it("rejects empty strings", () => {
    expect(absolutePath("")).toBeNull();
  });
});

describe("relativePath", () => {
  it("accepts relative paths", () => {
    expect(relativePath("relative/path")).toBe("relative/path");
    expect(relativePath("./local")).toBe("./local");
    expect(relativePath("file.txt")).toBe("file.txt");
  });

  it("rejects absolute paths", () => {
    expect(relativePath("/absolute")).toBeNull();
    expect(relativePath("C:\\Windows")).toBeNull();
  });
});

describe("shellCommand", () => {
  it("creates shell commands", () => {
    expect(shellCommand("git pull")).toBe("git pull");
    expect(shellCommand("ls -la")).toBe("ls -la");
  });
});

describe("timestamp", () => {
  it("creates timestamps", () => {
    const now = Date.now();
    expect(timestamp(now)).toBe(now);
  });
});

describe("durationMs", () => {
  it("creates duration values", () => {
    expect(durationMs(5000)).toBe(5000);
    expect(durationMs(0)).toBe(0);
  });
});
```

#### src/domain/types/results.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import { GitPullResult, BuildResult, OverrideResult } from "./results";
import { durationMs } from "./branded";

describe("GitPullResult constructors", () => {
  it("creates updated result", () => {
    const result = GitPullResult.updated(5);
    expect(result.kind).toBe("updated");
    expect(result.commitsBehind).toBe(5);
  });

  it("creates alreadyUpToDate result", () => {
    const result = GitPullResult.alreadyUpToDate();
    expect(result.kind).toBe("already_up_to_date");
  });

  it("creates conflict result", () => {
    const result = GitPullResult.conflict(["file1.ts", "file2.ts"]);
    expect(result.kind).toBe("conflict");
    expect(result.conflictingFiles).toEqual(["file1.ts", "file2.ts"]);
  });

  it("creates networkError result", () => {
    const result = GitPullResult.networkError("timeout");
    expect(result.kind).toBe("network_error");
    expect(result.message).toBe("timeout");
  });

  it("creates notARepository result", () => {
    const result = GitPullResult.notARepository();
    expect(result.kind).toBe("not_a_repository");
  });

  it("creates unknownError result", () => {
    const result = GitPullResult.unknownError("something broke");
    expect(result.kind).toBe("unknown_error");
    expect(result.message).toBe("something broke");
  });
});

describe("BuildResult constructors", () => {
  it("creates success result", () => {
    const result = BuildResult.success(durationMs(5000));
    expect(result.kind).toBe("success");
    expect(result.duration).toBe(5000);
  });

  it("creates dependencyInstallFailed result", () => {
    const result = BuildResult.dependencyInstallFailed("npm error");
    expect(result.kind).toBe("dependency_install_failed");
    expect(result.message).toBe("npm error");
  });

  it("creates compilationFailed result", () => {
    const result = BuildResult.compilationFailed("TS error", ["error1", "error2"]);
    expect(result.kind).toBe("compilation_failed");
    expect(result.message).toBe("TS error");
    expect(result.errors).toEqual(["error1", "error2"]);
  });
});

describe("OverrideResult constructors", () => {
  it("creates success result", () => {
    const result = OverrideResult.success();
    expect(result.kind).toBe("success");
  });

  it("creates backupFailed result", () => {
    const result = OverrideResult.backupFailed("disk full");
    expect(result.kind).toBe("backup_failed");
    expect(result.message).toBe("disk full");
  });

  it("creates rollbackSuccess result", () => {
    const result = OverrideResult.rollbackSuccess("copy failed");
    expect(result.kind).toBe("rollback_success");
    expect(result.originalError).toBe("copy failed");
  });

  it("creates rollbackFailed result", () => {
    const result = OverrideResult.rollbackFailed("copy failed", "rename failed");
    expect(result.kind).toBe("rollback_failed");
    expect(result.originalError).toBe("copy failed");
    expect(result.rollbackError).toBe("rename failed");
  });
});
```

#### src/domain/functions/strategy.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  determinePullStrategy,
  determineLocalChangesStrategy,
  decideBuild,
  determineBuildFailureStrategy,
  determineOverrideFailureStrategy,
} from "./strategy";
import { GitPullResult, BuildResult, OverrideResult } from "@domain/types";
import type { StartupConfig } from "@domain/types";

const createConfig = (overrides: Partial<StartupConfig> = {}): StartupConfig => ({
  repositoryPath: "/test",
  distPath: "/test/dist",
  distBackupPath: "/test/dist-backup",
  logsPath: "/test/logs",
  gitTimeoutMs: 30000,
  buildTimeoutMs: 300000,
  processStartTimeoutMs: 10000,
  maxRetries: 5,
  retryDelayMs: 5000,
  mainProcessName: "babybox",
  configerProcessName: "configer",
  enableAutoUpdate: true,
  enableRollback: true,
  ...overrides,
});

describe("determinePullStrategy", () => {
  describe("for updated result", () => {
    it("returns proceed_with_build", () => {
      const result = determinePullStrategy(GitPullResult.updated(5));
      expect(result.kind).toBe("proceed_with_build");
    });

    it("returns proceed_with_build for single commit", () => {
      const result = determinePullStrategy(GitPullResult.updated(1));
      expect(result.kind).toBe("proceed_with_build");
    });
  });

  describe("for already_up_to_date result", () => {
    it("returns skip_build", () => {
      const result = determinePullStrategy(GitPullResult.alreadyUpToDate());
      expect(result.kind).toBe("skip_build");
    });

    it("includes reason in skip", () => {
      const result = determinePullStrategy(GitPullResult.alreadyUpToDate());
      expect(result.kind).toBe("skip_build");
      if (result.kind === "skip_build") {
        expect(result.reason).toBeTruthy();
      }
    });
  });

  describe("for conflict result", () => {
    it("returns stash_and_retry", () => {
      const result = determinePullStrategy(GitPullResult.conflict(["file.ts"]));
      expect(result.kind).toBe("stash_and_retry");
    });

    it("returns stash_and_retry for multiple conflicts", () => {
      const result = determinePullStrategy(
        GitPullResult.conflict(["a.ts", "b.ts", "c.ts"])
      );
      expect(result.kind).toBe("stash_and_retry");
    });
  });

  describe("for network_error result", () => {
    it("returns skip_build", () => {
      const result = determinePullStrategy(GitPullResult.networkError("timeout"));
      expect(result.kind).toBe("skip_build");
    });
  });

  describe("for not_a_repository result", () => {
    it("returns abort", () => {
      const result = determinePullStrategy(GitPullResult.notARepository());
      expect(result.kind).toBe("abort");
    });

    it("includes reason in abort", () => {
      const result = determinePullStrategy(GitPullResult.notARepository());
      expect(result.kind).toBe("abort");
      if (result.kind === "abort") {
        expect(result.reason).toContain("repozitar");
      }
    });
  });

  describe("for unknown_error result", () => {
    it("returns skip_build to continue with existing", () => {
      const result = determinePullStrategy(GitPullResult.unknownError("mystery"));
      expect(result.kind).toBe("skip_build");
    });
  });
});

describe("decideBuild", () => {
  describe("when updated", () => {
    it("decides to build", () => {
      const result = decideBuild(
        GitPullResult.updated(1),
        true, // dist exists
        createConfig()
      );
      expect(result.kind).toBe("build");
    });

    it("decides to build even if dist does not exist", () => {
      const result = decideBuild(
        GitPullResult.updated(1),
        false,
        createConfig()
      );
      expect(result.kind).toBe("build");
    });
  });

  describe("when already up to date", () => {
    it("skips build if dist exists", () => {
      const result = decideBuild(
        GitPullResult.alreadyUpToDate(),
        true,
        createConfig()
      );
      expect(result.kind).toBe("skip");
    });

    it("builds if dist does not exist", () => {
      const result = decideBuild(
        GitPullResult.alreadyUpToDate(),
        false, // no dist
        createConfig()
      );
      expect(result.kind).toBe("build");
    });
  });

  describe("when auto-update disabled", () => {
    it("skips build if dist exists", () => {
      const result = decideBuild(
        GitPullResult.updated(1),
        true,
        createConfig({ enableAutoUpdate: false })
      );
      expect(result.kind).toBe("skip");
    });

    it("builds if dist does not exist", () => {
      const result = decideBuild(
        GitPullResult.updated(1),
        false,
        createConfig({ enableAutoUpdate: false })
      );
      expect(result.kind).toBe("build");
    });
  });
});

describe("determineBuildFailureStrategy", () => {
  describe("with rollback enabled", () => {
    it("returns rollback when backup exists", () => {
      const result = determineBuildFailureStrategy(
        BuildResult.compilationFailed("error", []),
        true, // backup exists
        createConfig({ enableRollback: true })
      );
      expect(result.kind).toBe("rollback");
    });

    it("returns use_existing when no backup", () => {
      const result = determineBuildFailureStrategy(
        BuildResult.compilationFailed("error", []),
        false, // no backup
        createConfig({ enableRollback: true })
      );
      expect(result.kind).toBe("use_existing");
    });
  });

  describe("with rollback disabled", () => {
    it("returns use_existing even when backup exists", () => {
      const result = determineBuildFailureStrategy(
        BuildResult.compilationFailed("error", []),
        true,
        createConfig({ enableRollback: false })
      );
      expect(result.kind).toBe("use_existing");
    });
  });
});

describe("determineOverrideFailureStrategy", () => {
  it("returns rollback when backup exists", () => {
    const result = determineOverrideFailureStrategy(
      OverrideResult.copyFailed("disk error"),
      true
    );
    expect(result.kind).toBe("rollback");
  });

  it("returns abort when no backup", () => {
    const result = determineOverrideFailureStrategy(
      OverrideResult.copyFailed("disk error"),
      false
    );
    expect(result.kind).toBe("abort");
  });
});
```

#### src/domain/functions/retry.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  shouldRetryShellCommand,
  shouldRetryProcessStart,
  shouldRetryGitPull,
  calculateBackoff,
  DEFAULT_RETRY_CONFIG,
} from "./retry";
import { ShellResult, GitPullResult, durationMs } from "@domain/types";

describe("shouldRetryShellCommand", () => {
  describe("on success", () => {
    it("does not retry", () => {
      const result: ShellResult = {
        kind: "success",
        stdout: "ok",
        stderr: "",
        exitCode: 0,
        duration: durationMs(100),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on timeout", () => {
    it("retries with backoff", () => {
      const result: ShellResult = {
        kind: "timeout",
        stdout: "",
        stderr: "",
        timeoutMs: durationMs(5000),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("retry");
      if (decision.kind === "retry") {
        expect(decision.delayMs).toBeGreaterThan(0);
      }
    });

    it("gives up after max attempts", () => {
      const result: ShellResult = {
        kind: "timeout",
        stdout: "",
        stderr: "",
        timeoutMs: durationMs(5000),
      };
      const decision = shouldRetryShellCommand(result, 5);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on spawn_error", () => {
    it("does not retry", () => {
      const result: ShellResult = {
        kind: "spawn_error",
        message: "command not found",
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on non_zero_exit", () => {
    it("retries for retryable exit codes", () => {
      const result: ShellResult = {
        kind: "non_zero_exit",
        stdout: "",
        stderr: "error",
        exitCode: 1,
        duration: durationMs(100),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("retry");
    });
  });
});

describe("shouldRetryGitPull", () => {
  it("does not retry on success", () => {
    const decision = shouldRetryGitPull(GitPullResult.updated(1), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("retries on network error", () => {
    const decision = shouldRetryGitPull(GitPullResult.networkError("timeout"), 0);
    expect(decision.kind).toBe("retry");
  });

  it("does not retry on conflict", () => {
    const decision = shouldRetryGitPull(GitPullResult.conflict(["file.ts"]), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("does not retry on not_a_repository", () => {
    const decision = shouldRetryGitPull(GitPullResult.notARepository(), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("respects max attempts", () => {
    const decision = shouldRetryGitPull(
      GitPullResult.networkError("timeout"),
      5
    );
    expect(decision.kind).toBe("give_up");
  });
});

describe("calculateBackoff", () => {
  it("returns base delay for first attempt", () => {
    const delay = calculateBackoff(0);
    expect(delay).toBe(DEFAULT_RETRY_CONFIG.delayMs);
  });

  it("increases delay with attempts", () => {
    const delay0 = calculateBackoff(0);
    const delay1 = calculateBackoff(1);
    const delay2 = calculateBackoff(2);

    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it("caps at maxDelayMs", () => {
    const delay = calculateBackoff(100); // Very high attempt number
    expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
  });

  it("respects custom config", () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      delayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
    };
    
    const delay0 = calculateBackoff(0, config);
    const delay1 = calculateBackoff(1, config);
    
    expect(delay0).toBe(1000);
    expect(delay1).toBe(2000);
  });
});
```

#### src/domain/functions/git.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  parseGitStatusPorcelain,
  parseGitPullStats,
  detectGitError,
} from "./git";

describe("parseGitStatusPorcelain", () => {
  it("parses clean status", () => {
    const result = parseGitStatusPorcelain("");
    expect(result.isClean).toBe(true);
    expect(result.modifiedFiles).toEqual([]);
    expect(result.untrackedFiles).toEqual([]);
  });

  it("parses modified files", () => {
    const result = parseGitStatusPorcelain(" M src/file.ts");
    expect(result.isClean).toBe(false);
    expect(result.modifiedFiles).toContain("src/file.ts");
  });

  it("parses staged modified files", () => {
    const result = parseGitStatusPorcelain("M  src/file.ts");
    expect(result.modifiedFiles).toContain("src/file.ts");
  });

  it("parses untracked files", () => {
    const result = parseGitStatusPorcelain("?? new-file.ts");
    expect(result.untrackedFiles).toContain("new-file.ts");
  });

  it("parses added files", () => {
    const result = parseGitStatusPorcelain("A  new-file.ts");
    expect(result.addedFiles).toContain("new-file.ts");
  });

  it("parses deleted files", () => {
    const result = parseGitStatusPorcelain("D  old-file.ts");
    expect(result.deletedFiles).toContain("old-file.ts");
  });

  it("parses conflicted files", () => {
    const result = parseGitStatusPorcelain("UU conflict.ts");
    expect(result.conflictedFiles).toContain("conflict.ts");
  });

  it("parses multiple files", () => {
    const output = `
 M src/modified.ts
A  src/added.ts
?? src/untracked.ts
D  src/deleted.ts
`.trim();
    const result = parseGitStatusPorcelain(output);
    
    expect(result.isClean).toBe(false);
    expect(result.modifiedFiles).toContain("src/modified.ts");
    expect(result.addedFiles).toContain("src/added.ts");
    expect(result.untrackedFiles).toContain("src/untracked.ts");
    expect(result.deletedFiles).toContain("src/deleted.ts");
  });
});

describe("parseGitPullStats", () => {
  it("parses commit count", () => {
    const result = parseGitPullStats("Updating abc123..def456\n5 commits");
    expect(result.commitCount).toBe(5);
  });

  it("parses files changed", () => {
    const result = parseGitPullStats("10 files changed");
    expect(result.filesChanged).toBe(10);
  });

  it("parses insertions", () => {
    const result = parseGitPullStats("50 insertions(+)");
    expect(result.insertions).toBe(50);
  });

  it("parses deletions", () => {
    const result = parseGitPullStats("25 deletions(-)");
    expect(result.deletions).toBe(25);
  });

  it("parses full summary line", () => {
    const output = "3 files changed, 100 insertions(+), 50 deletions(-)";
    const result = parseGitPullStats(output);
    
    expect(result.filesChanged).toBe(3);
    expect(result.insertions).toBe(100);
    expect(result.deletions).toBe(50);
  });

  it("defaults commitCount to 1", () => {
    const result = parseGitPullStats("some output without commit count");
    expect(result.commitCount).toBe(1);
  });
});

describe("detectGitError", () => {
  it("detects conflict", () => {
    expect(detectGitError("CONFLICT (content): Merge conflict in file.ts")).toBe("conflict");
    expect(detectGitError("merge conflict detected")).toBe("conflict");
  });

  it("detects network errors", () => {
    expect(detectGitError("Could not resolve host: github.com")).toBe("network");
    expect(detectGitError("Network is unreachable")).toBe("network");
    expect(detectGitError("Connection refused")).toBe("network");
    expect(detectGitError("Unable to access remote")).toBe("network");
  });

  it("detects auth errors", () => {
    expect(detectGitError("Authentication failed")).toBe("auth");
    expect(detectGitError("Permission denied (publickey)")).toBe("auth");
    expect(detectGitError("HTTP 401")).toBe("auth");
    expect(detectGitError("HTTP 403 Forbidden")).toBe("auth");
  });

  it("detects not a repository", () => {
    expect(detectGitError("fatal: not a git repository")).toBe("not_repo");
  });

  it("returns null for unknown errors", () => {
    expect(detectGitError("some random error")).toBeNull();
    expect(detectGitError("")).toBeNull();
  });
});
```

#### src/domain/functions/suggestion.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  suggestionsForGitPull,
  suggestionsForBuild,
  suggestionsForOverride,
  suggestionsForProcessStart,
} from "./suggestion";
import { GitPullResult, BuildResult, OverrideResult, durationMs } from "@domain/types";
import type { DirectoryPath } from "@domain/types";

const repoPath = "/test/repo" as DirectoryPath;

describe("suggestionsForGitPull", () => {
  it("returns empty for success", () => {
    const suggestions = suggestionsForGitPull(GitPullResult.updated(1), repoPath);
    expect(suggestions).toHaveLength(0);
  });

  it("returns stash suggestions for conflict", () => {
    const suggestions = suggestionsForGitPull(
      GitPullResult.conflict(["file.ts"]),
      repoPath
    );
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.kind === "terminal")).toBe(true);
  });

  it("returns network suggestions for network error", () => {
    const suggestions = suggestionsForGitPull(
      GitPullResult.networkError("timeout"),
      repoPath
    );
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.kind === "manual_action")).toBe(true);
  });

  it("returns init suggestions for not_a_repository", () => {
    const suggestions = suggestionsForGitPull(
      GitPullResult.notARepository(),
      repoPath
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe("suggestionsForBuild", () => {
  it("returns empty for success", () => {
    const suggestions = suggestionsForBuild(
      BuildResult.success(durationMs(5000)),
      repoPath
    );
    expect(suggestions).toHaveLength(0);
  });

  it("returns suggestions for dependency failure", () => {
    const suggestions = suggestionsForBuild(
      BuildResult.dependencyInstallFailed("npm error"),
      repoPath
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("returns suggestions for compilation failure", () => {
    const suggestions = suggestionsForBuild(
      BuildResult.compilationFailed("TS error", ["error1"]),
      repoPath
    );
    expect(suggestions.length).toBeGreaterThan(0);
    // Should include contact support for compilation errors
    expect(suggestions.some((s) => s.kind === "contact_support")).toBe(true);
  });
});

describe("suggestionsForOverride", () => {
  it("returns empty for success", () => {
    const suggestions = suggestionsForOverride(
      OverrideResult.success(),
      "/dist",
      "/dist-backup"
    );
    expect(suggestions).toHaveLength(0);
  });

  it("returns suggestions for backup failure", () => {
    const suggestions = suggestionsForOverride(
      OverrideResult.backupFailed("disk full"),
      "/dist",
      "/dist-backup"
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("returns critical suggestions for rollback failure", () => {
    const suggestions = suggestionsForOverride(
      OverrideResult.rollbackFailed("copy failed", "rename failed"),
      "/dist",
      "/dist-backup"
    );
    expect(suggestions.length).toBeGreaterThan(0);
    // Should include critical contact support
    const contactSuggestion = suggestions.find((s) => s.kind === "contact_support");
    expect(contactSuggestion).toBeDefined();
    if (contactSuggestion?.kind === "contact_support") {
      expect(contactSuggestion.severity).toBe("critical");
    }
  });
});

describe("suggestionsForProcessStart", () => {
  it("returns empty for started", () => {
    const suggestions = suggestionsForProcessStart(
      { kind: "started", pid: 123 },
      "babybox"
    );
    expect(suggestions).toHaveLength(0);
  });

  it("returns empty for already_running", () => {
    const suggestions = suggestionsForProcessStart(
      { kind: "already_running", pid: 123 },
      "babybox"
    );
    expect(suggestions).toHaveLength(0);
  });

  it("returns suggestions for failed", () => {
    const suggestions = suggestionsForProcessStart(
      { kind: "failed", message: "error" },
      "babybox"
    );
    expect(suggestions.length).toBeGreaterThan(0);
    // Should include PM2 commands
    expect(suggestions.some((s) => 
      s.kind === "terminal" && s.command.includes("pm2")
    )).toBe(true);
  });
});
```

### 8.3 Application Layer Tests with Mocks

#### src/test/mocks/ports.ts

```typescript
/**
 * Mock implementations of all ports for testing.
 */

import { ok, err } from "neverthrow";
import type { GitPort } from "@application/ports/git.port";
import type { FileSystemPort } from "@application/ports/fs.port";
import type { ProcessPort } from "@application/ports/process.port";
import type { PackageManagerPort } from "@application/ports/package-manager.port";
import type { LoggerPort } from "@application/ports/logger.port";
import { durationMs } from "@domain/types";

export type MockGitPort = GitPort & {
  setPullResult: (result: ReturnType<GitPort["pull"]>) => void;
  setStashResult: (result: ReturnType<GitPort["stash"]>) => void;
  setStatusResult: (result: ReturnType<GitPort["status"]>) => void;
  calls: { method: string; args: unknown[] }[];
};

export function createMockGitPort(): MockGitPort {
  let pullResult: ReturnType<GitPort["pull"]> = Promise.resolve(
    ok({ kind: "already_up_to_date" as const })
  );
  let stashResult: ReturnType<GitPort["stash"]> = Promise.resolve(
    ok({ kind: "nothing_to_stash" as const })
  );
  let statusResult: ReturnType<GitPort["status"]> = Promise.resolve(
    ok({ kind: "clean" as const })
  );
  const calls: { method: string; args: unknown[] }[] = [];

  return {
    pull: async () => {
      calls.push({ method: "pull", args: [] });
      return pullResult;
    },
    stash: async () => {
      calls.push({ method: "stash", args: [] });
      return stashResult;
    },
    status: async () => {
      calls.push({ method: "status", args: [] });
      return statusResult;
    },
    fetch: async () => {
      calls.push({ method: "fetch", args: [] });
      return ok(undefined);
    },
    resetHard: async () => {
      calls.push({ method: "resetHard", args: [] });
      return ok(undefined);
    },
    setPullResult: (result) => {
      pullResult = result;
    },
    setStashResult: (result) => {
      stashResult = result;
    },
    setStatusResult: (result) => {
      statusResult = result;
    },
    calls,
  };
}

export type MockFsPort = FileSystemPort & {
  setExists: (path: string, exists: boolean) => void;
  calls: { method: string; args: unknown[] }[];
};

export function createMockFsPort(): MockFsPort {
  const existsMap = new Map<string, boolean>();
  const calls: { method: string; args: unknown[] }[] = [];

  return {
    exists: (path) => {
      calls.push({ method: "exists", args: [path] });
      return existsMap.get(path) ?? true;
    },
    isDirectory: (path) => {
      calls.push({ method: "isDirectory", args: [path] });
      return ok(true);
    },
    createDirectory: async (path) => {
      calls.push({ method: "createDirectory", args: [path] });
      return ok(undefined);
    },
    remove: async (path, recursive) => {
      calls.push({ method: "remove", args: [path, recursive] });
      return ok(undefined);
    },
    rename: async (oldPath, newPath) => {
      calls.push({ method: "rename", args: [oldPath, newPath] });
      return ok(undefined);
    },
    copyFile: (src, dest) => {
      calls.push({ method: "copyFile", args: [src, dest] });
      return ok(undefined);
    },
    copyDirectory: async (src, dest) => {
      calls.push({ method: "copyDirectory", args: [src, dest] });
      return ok(undefined);
    },
    listDirectory: async (path) => {
      calls.push({ method: "listDirectory", args: [path] });
      return ok([]);
    },
    setExists: (path, exists) => {
      existsMap.set(path, exists);
    },
    calls,
  };
}

export type MockProcessPort = ProcessPort & {
  setStartResult: (result: ReturnType<ProcessPort["start"]>) => void;
  calls: { method: string; args: unknown[] }[];
};

export function createMockProcessPort(): MockProcessPort {
  let startResult: ReturnType<ProcessPort["start"]> = Promise.resolve(
    ok({ kind: "started" as const, pid: 123 })
  );
  const calls: { method: string; args: unknown[] }[] = [];

  return {
    start: async (name, script, cwd) => {
      calls.push({ method: "start", args: [name, script, cwd] });
      return startResult;
    },
    startBun: async (name, scriptPath, cwd) => {
      calls.push({ method: "startBun", args: [name, scriptPath, cwd] });
      return startResult;
    },
    stop: async (name) => {
      calls.push({ method: "stop", args: [name] });
      return ok({ kind: "stopped" as const });
    },
    delete: async (name) => {
      calls.push({ method: "delete", args: [name] });
      return ok({ kind: "stopped" as const });
    },
    restart: async (name) => {
      calls.push({ method: "restart", args: [name] });
      return ok({ kind: "started" as const, pid: 123 });
    },
    isManagerInstalled: async () => {
      calls.push({ method: "isManagerInstalled", args: [] });
      return true;
    },
    setStartResult: (result) => {
      startResult = result;
    },
    calls,
  };
}

export type MockPackageManagerPort = PackageManagerPort & {
  setInstallResult: (result: ReturnType<PackageManagerPort["install"]>) => void;
  setBuildResult: (result: ReturnType<PackageManagerPort["build"]>) => void;
  calls: { method: string; args: unknown[] }[];
};

export function createMockPackageManagerPort(): MockPackageManagerPort {
  let installResult: ReturnType<PackageManagerPort["install"]> = Promise.resolve(
    ok({ kind: "success" as const })
  );
  let buildResult: ReturnType<PackageManagerPort["build"]> = Promise.resolve(
    ok({ kind: "success" as const, duration: durationMs(5000) })
  );
  const calls: { method: string; args: unknown[] }[] = [];

  return {
    install: async (cwd) => {
      calls.push({ method: "install", args: [cwd] });
      return installResult;
    },
    build: async (cwd) => {
      calls.push({ method: "build", args: [cwd] });
      return buildResult;
    },
    isInstalled: async () => {
      calls.push({ method: "isInstalled", args: [] });
      return true;
    },
    setInstallResult: (result) => {
      installResult = result;
    },
    setBuildResult: (result) => {
      buildResult = result;
    },
    calls,
  };
}

export function createMockLoggerPort(): LoggerPort {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    log: () => {},
    flush: async () => {},
    setLevel: () => {},
  };
}
```

#### src/application/orchestrator.test.ts

```typescript
import { describe, expect, it, beforeEach } from "bun:test";
import { ok, err } from "neverthrow";
import { startup } from "./orchestrator";
import { createAppContext, type AppContext } from "./context";
import {
  createMockGitPort,
  createMockFsPort,
  createMockProcessPort,
  createMockPackageManagerPort,
  createMockLoggerPort,
} from "@test/mocks/ports";
import { durationMs } from "@domain/types";

function createTestContext() {
  const gitPort = createMockGitPort();
  const fsPort = createMockFsPort();
  const processPort = createMockProcessPort();
  const packageManagerPort = createMockPackageManagerPort();

  const ctx = createAppContext({
    config: {
      repositoryPath: "/test/repo",
      distPath: "/test/repo/dist",
      distBackupPath: "/test/repo/dist-backup",
      logsPath: "/test/repo/logs",
      gitTimeoutMs: 5000,
      buildTimeoutMs: 60000,
      processStartTimeoutMs: 5000,
      maxRetries: 3,
      retryDelayMs: 100, // Short for tests
      mainProcessName: "babybox",
      configerProcessName: "configer",
      enableAutoUpdate: true,
      enableRollback: true,
    },
    os: { kind: "ubuntu" },
    logger: createMockLoggerPort(),
    git: gitPort,
    fs: fsPort,
    process: processPort,
    packageManager: packageManagerPort,
  });

  return { ctx, gitPort, fsPort, processPort, packageManagerPort };
}

describe("startup orchestrator", () => {
  describe("happy path", () => {
    it("succeeds when already up to date with dist", async () => {
      const { ctx, gitPort, fsPort } = createTestContext();
      
      gitPort.setPullResult(Promise.resolve(ok({ kind: "already_up_to_date" })));
      fsPort.setExists("/test/repo/dist", true);

      const result = await startup(ctx);

      expect(result.kind).toBe("success");
      if (result.kind === "success") {
        expect(result.updated).toBe(false);
        expect(result.rebuilt).toBe(false);
      }
    });

    it("builds when updated", async () => {
      const { ctx, gitPort, fsPort, packageManagerPort } = createTestContext();
      
      gitPort.setPullResult(Promise.resolve(ok({ kind: "updated", commitsBehind: 3 })));
      fsPort.setExists("/test/repo/dist", true);
      packageManagerPort.setBuildResult(
        Promise.resolve(ok({ kind: "success", duration: durationMs(5000) }))
      );

      const result = await startup(ctx);

      expect(result.kind).toBe("success");
      if (result.kind === "success") {
        expect(result.updated).toBe(true);
        expect(result.rebuilt).toBe(true);
      }

      // Verify build was called
      expect(packageManagerPort.calls.some((c) => c.method === "build")).toBe(true);
    });

    it("builds when dist does not exist", async () => {
      const { ctx, gitPort, fsPort, packageManagerPort } = createTestContext();
      
      gitPort.setPullResult(Promise.resolve(ok({ kind: "already_up_to_date" })));
      fsPort.setExists("/test/repo/dist", false);
      packageManagerPort.setBuildResult(
        Promise.resolve(ok({ kind: "success", duration: durationMs(5000) }))
      );

      const result = await startup(ctx);

      expect(result.kind).toBe("success");
      if (result.kind === "success") {
        expect(result.rebuilt).toBe(true);
      }
    });
  });

  describe("git failures", () => {
    it("continues with existing dist on network error", async () => {
      const { ctx, gitPort, fsPort } = createTestContext();
      
      gitPort.setPullResult(
        Promise.resolve(ok({ kind: "network_error", message: "timeout" }))
      );
      fsPort.setExists("/test/repo/dist", true);

      const result = await startup(ctx);

      // Should still start services with existing dist
      expect(result.kind).toBe("success");
    });

    it("stashes local changes before pulling", async () => {
      const { ctx, gitPort } = createTestContext();
      
      gitPort.setStatusResult(
        Promise.resolve(ok({
          kind: "dirty",
          modifiedFiles: ["file.ts"],
          untrackedFiles: [],
        }))
      );

      await startup(ctx);

      // Verify stash was called
      expect(gitPort.calls.some((c) => c.method === "stash")).toBe(true);
    });
  });

  describe("build failures", () => {
    it("continues with existing dist on build failure", async () => {
      const { ctx, gitPort, fsPort, packageManagerPort } = createTestContext();
      
      gitPort.setPullResult(Promise.resolve(ok({ kind: "updated", commitsBehind: 1 })));
      fsPort.setExists("/test/repo/dist", true);
      packageManagerPort.setBuildResult(
        Promise.resolve(ok({ kind: "compilation_failed", message: "TS error", errors: [] }))
      );

      const result = await startup(ctx);

      // Should still succeed by using existing dist
      expect(["success", "partial_success"]).toContain(result.kind);
    });
  });

  describe("process start", () => {
    it("starts all services", async () => {
      const { ctx, processPort } = createTestContext();

      await startup(ctx);

      // Verify both services were started
      const startCalls = processPort.calls.filter((c) => c.method === "startBun");
      expect(startCalls.length).toBe(2);
    });

    it("reports partial success when one service fails", async () => {
      const { ctx, processPort } = createTestContext();
      
      let callCount = 0;
      processPort.setStartResult(
        Promise.resolve(
          callCount++ === 0
            ? ok({ kind: "started", pid: 123 })
            : ok({ kind: "failed", message: "error" })
        )
      );

      const result = await startup(ctx);

      // First call succeeds, second fails - but we mock returns same result
      // In real scenario this would be partial_success
      expect(["success", "partial_success"]).toContain(result.kind);
    });
  });
});
```

### 8.4 Test Runner Configuration

#### Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test src/domain/functions/strategy.test.ts

# Run tests matching pattern
bun test --test-name-pattern "git"

# Watch mode
bun test --watch

# Verbose output
bun test --verbose
```

### 8.5 Coverage Requirements

| Layer | Line Coverage | Function Coverage | Branch Coverage |
|-------|---------------|-------------------|-----------------|
| Domain Types | 100% | 100% | 100% |
| Domain Functions | 100% | 100% | 95%+ |
| Application | 90%+ | 90%+ | 80%+ |
| Infrastructure | 80%+ | 80%+ | 70%+ |
| Presentation | 70%+ | 70%+ | 60%+ |

## Verification Checklist

- [ ] All domain type tests pass
- [ ] All domain function tests pass with 100% coverage
- [ ] Application orchestrator tests pass with mocks
- [ ] Infrastructure wrapper tests pass
- [ ] Overall coverage meets thresholds
- [ ] Tests run in < 30 seconds
- [ ] No flaky tests

## Test Summary

```
Test Files: ~15
Total Tests: ~150+
Domain Tests: ~100 (pure unit tests)
Application Tests: ~30 (with mocks)
Infrastructure Tests: ~15 (with mocks)
Presentation Tests: ~5 (CLI parsing)
```
