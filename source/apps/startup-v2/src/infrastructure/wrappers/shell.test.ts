import { describe, expect, it } from "bun:test";
import { executeCommand } from "./shell";
import { shellCommand, durationMs } from "../../domain/types/index";

describe("shell wrapper", () => {
  it("executes simple commands", async () => {
    const result = await executeCommand(shellCommand("echo hello"));
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("success");
    if (shellResult.kind === "success") {
      expect(shellResult.stdout.trim()).toBe("hello");
    }
  });

  it("handles non-zero exit codes", async () => {
    const result = await executeCommand(shellCommand("sh -c 'exit 1'"));
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("non_zero_exit");
    if (shellResult.kind === "non_zero_exit") {
      expect(shellResult.exitCode).toBe(1);
    }
  });

  it("handles timeouts", async () => {
    const result = await executeCommand(shellCommand("sleep 10"), {
      timeoutMs: durationMs(100),
    });
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("timeout");
  });

  it("handles invalid commands", async () => {
    const result = await executeCommand(
      shellCommand("this-command-does-not-exist-12345")
    );
    const shellResult = result._unsafeUnwrap();

    // Could be spawn_error or non_zero_exit depending on shell
    expect(["spawn_error", "non_zero_exit"]).toContain(shellResult.kind);
  });

  it("captures stderr", async () => {
    const result = await executeCommand(
      shellCommand("sh -c 'echo error >&2'")
    );
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("success");
    if (shellResult.kind === "success") {
      expect(shellResult.stderr.trim()).toBe("error");
    }
  });
});
