import { describe, expect, it } from "bun:test";
import {
  parseGitStatusPorcelain,
  parseGitPullStats,
  detectGitError,
} from "./git";

describe("parseGitStatusPorcelain", () => {
  it("parses clean status (empty output)", () => {
    const result = parseGitStatusPorcelain("");
    expect(result.isClean).toBe(true);
    expect(result.modifiedFiles).toEqual([]);
    expect(result.addedFiles).toEqual([]);
    expect(result.deletedFiles).toEqual([]);
    expect(result.untrackedFiles).toEqual([]);
    expect(result.conflictedFiles).toEqual([]);
  });

  it("parses worktree modified files ( M)", () => {
    const result = parseGitStatusPorcelain(" M src/file.ts");
    expect(result.isClean).toBe(false);
    expect(result.modifiedFiles).toContain("src/file.ts");
  });

  it("parses index modified files (M )", () => {
    const result = parseGitStatusPorcelain("M  src/file.ts");
    expect(result.modifiedFiles).toContain("src/file.ts");
  });

  it("parses untracked files (??)", () => {
    const result = parseGitStatusPorcelain("?? new-file.ts");
    expect(result.untrackedFiles).toContain("new-file.ts");
  });

  it("parses added files (A )", () => {
    const result = parseGitStatusPorcelain("A  new-file.ts");
    expect(result.addedFiles).toContain("new-file.ts");
  });

  it("parses deleted files (D )", () => {
    const result = parseGitStatusPorcelain("D  old-file.ts");
    expect(result.deletedFiles).toContain("old-file.ts");
  });

  it("parses deleted files in worktree ( D)", () => {
    const result = parseGitStatusPorcelain(" D old-file.ts");
    expect(result.deletedFiles).toContain("old-file.ts");
  });

  it("parses conflicted files (UU)", () => {
    const result = parseGitStatusPorcelain("UU conflict.ts");
    expect(result.conflictedFiles).toContain("conflict.ts");
  });

  it("parses multiple files", () => {
    const output = [
      " M src/modified.ts",
      "A  src/added.ts",
      "?? src/untracked.ts",
      "D  src/deleted.ts",
    ].join("\n");
    const result = parseGitStatusPorcelain(output);

    expect(result.isClean).toBe(false);
    expect(result.modifiedFiles).toContain("src/modified.ts");
    expect(result.addedFiles).toContain("src/added.ts");
    expect(result.untrackedFiles).toContain("src/untracked.ts");
    expect(result.deletedFiles).toContain("src/deleted.ts");
  });

  it("marks as not clean when files present", () => {
    const result = parseGitStatusPorcelain("?? untracked.ts");
    expect(result.isClean).toBe(false);
  });
});

describe("parseGitPullStats", () => {
  it("parses commit count", () => {
    const result = parseGitPullStats("Updating abc123..def456\n5 commits");
    expect(result.commitCount).toBe(5);
  });

  it("parses single commit", () => {
    const result = parseGitPullStats("1 commit");
    expect(result.commitCount).toBe(1);
  });

  it("parses files changed", () => {
    const result = parseGitPullStats("10 files changed, 20 insertions(+), 5 deletions(-)");
    expect(result.filesChanged).toBe(10);
  });

  it("parses single file changed", () => {
    const result = parseGitPullStats("1 file changed");
    expect(result.filesChanged).toBe(1);
  });

  it("parses insertions", () => {
    const result = parseGitPullStats("10 files changed, 25 insertions(+)");
    expect(result.insertions).toBe(25);
  });

  it("parses deletions", () => {
    const result = parseGitPullStats("10 files changed, 5 deletions(-)");
    expect(result.deletions).toBe(5);
  });

  it("returns 1 for commitCount when updated but no count found", () => {
    const result = parseGitPullStats("Fast-forward\n file.ts | 2 +-");
    expect(result.commitCount).toBe(1);
  });

  it("handles empty output gracefully", () => {
    const result = parseGitPullStats("");
    expect(result.commitCount).toBe(1); // defaults to 1
    expect(result.filesChanged).toBe(0);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
  });
});

describe("detectGitError", () => {
  it("detects conflict errors", () => {
    expect(detectGitError("CONFLICT (content): Merge conflict in file.ts")).toBe("conflict");
    expect(detectGitError("merge conflict detected")).toBe("conflict");
  });

  it("detects network errors", () => {
    expect(detectGitError("Could not resolve host: github.com")).toBe("network");
    expect(detectGitError("Connection refused")).toBe("network");
    expect(detectGitError("unable to access 'https://github.com'")).toBe("network");
  });

  it("detects auth errors", () => {
    expect(detectGitError("Authentication failed for 'https://github.com'")).toBe("auth");
    expect(detectGitError("Permission denied (publickey)")).toBe("auth");
    expect(detectGitError("Error 401 Unauthorized")).toBe("auth");
    expect(detectGitError("403 Forbidden")).toBe("auth");
  });

  it("detects not a git repository", () => {
    expect(detectGitError("fatal: not a git repository")).toBe("not_repo");
  });

  it("returns null for unknown errors", () => {
    expect(detectGitError("some other error")).toBeNull();
    expect(detectGitError("")).toBeNull();
  });
});
