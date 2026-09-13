import { type MainConfig, defaultConfig } from "@babybox/config-schema";
import { describe, expect, it, vi } from "vitest";

import type { SaveResult } from "@/api/config";
import type { ReloadResult } from "@/api/reload";
import type { DraftConfig } from "@/logic/config/configForm";
import { type SaveCalls, runSave } from "@/logic/config/saveFlow";
import { LogEntryType } from "@/types/settings/manager.types";

function draft(): DraftConfig {
  const config: MainConfig = defaultConfig();
  config.units.engine.ip = "10.1.1.99";
  return config;
}

function calls(
  saved: SaveResult | Error,
  reloaded: ReloadResult = { ok: true, unapplied: [] },
): SaveCalls & { order: string[] } {
  const order: string[] = [];
  return {
    order,
    saveConfig: vi.fn(() => {
      order.push("save");
      return saved instanceof Error
        ? Promise.reject(saved)
        : Promise.resolve(saved);
    }),
    reloadBackendConfig: vi.fn(() => {
      order.push("reload");
      return Promise.resolve(reloaded);
    }),
  };
}

const messages = (log: { message: string }[]) => log.map((l) => l.message);

describe("runSave", () => {
  it("sends nothing when the form has errors", async () => {
    const deps = calls({ ok: true });

    const result = await runSave(draft(), true, deps);

    expect(result.outcome).toEqual({ kind: "notSent" });
    expect(deps.saveConfig).not.toHaveBeenCalled();
    expect(deps.reloadBackendConfig).not.toHaveBeenCalled();
    expect(result.serverErrors).toEqual([]);
    expect(messages(result.log)).toEqual([
      "Formulář obsahuje chyby, neodesílám nic.",
    ]);
  });

  /*
   * The PATCH aborted after 10 s. configer may have written the file, so the line
   * must not claim the config was not saved.
   */
  it("says the outcome is unknown when configer does not answer", async () => {
    const deps = calls(new Error("aborted"));

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "notSent" });
    expect(deps.reloadBackendConfig).not.toHaveBeenCalled();
    expect(result.log[result.log.length - 1]).toEqual({
      message:
        "Configer neodpověděl včas. Konfigurace se možná uložila — načti stránku znovu a zkontroluj to.",
      type: LogEntryType.Error,
    });
  });

  it("surfaces the fields a 400 named and does not reload", async () => {
    const errors = [{ path: "units.engine.ip", msg: "must be a string" }];
    const deps = calls({ ok: false, status: 400, errors });

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "rejected" });
    expect(result.serverErrors).toEqual(errors);
    expect(deps.reloadBackendConfig).not.toHaveBeenCalled();
    expect(messages(result.log)).toContain(
      "Configer konfiguraci odmítl (HTTP 400).",
    );
    expect(messages(result.log)).toContain("units.engine.ip: must be a string");
  });

  /* A 500 is a failed write of main.json, not a refusal of the body. */
  it("calls a 500 a failed write and repeats configer's own line", async () => {
    const deps = calls({
      ok: false,
      status: 500,
      errors: [],
      msg: "cannot write main.json: no space left on device",
    });

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "rejected" });
    expect(messages(result.log)).toContain(
      "Configer konfiguraci nezapsal, selhal zápis souboru (HTTP 500). cannot write main.json: no space left on device",
    );
  });

  it("reloads the backend only after the save went through", async () => {
    const deps = calls({ ok: true });

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "applied", unapplied: [] });
    expect(deps.order).toEqual(["save", "reload"]);
  });

  it("carries the fields the backend could not apply", async () => {
    const unapplied = [{ path: "backend.port", running: 5000, stored: 5050 }];
    const deps = calls({ ok: true }, { ok: true, unapplied });

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "applied", unapplied });
  });

  it("reports a failed reload after a save that worked", async () => {
    const deps = calls({ ok: true }, { ok: false });

    const result = await runSave(draft(), false, deps);

    expect(result.outcome).toEqual({ kind: "reloadFailed" });
    expect(result.serverErrors).toEqual([]);
    expect(messages(result.log)).toContain(
      "Backend novou konfiguraci nenačetl, restartuj ho.",
    );
  });

  /* hasErrors already ran the same schema, so this branch is a guard, not a check. */
  it("sends nothing when the draft does not parse", async () => {
    const bad = draft() as Record<string, unknown>;
    delete bad.units;
    const deps = calls({ ok: true });

    const result = await runSave(bad, false, deps);

    expect(result.outcome).toEqual({ kind: "notSent" });
    expect(deps.saveConfig).not.toHaveBeenCalled();
    expect(messages(result.log)).toEqual(["Konfigurace neodpovídá schématu."]);
  });
});
