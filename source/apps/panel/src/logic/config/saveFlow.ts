import {
  type ConfigError,
  type MainConfig,
  parseMainConfig,
} from "@babybox/config-schema";

import type { SaveResult } from "@/api/config";
import type { ReloadResult } from "@/api/reload";
import type { DraftConfig } from "@/logic/config/configForm";
import type { SaveOutcome } from "@/logic/config/restartBanner";
import { LogEntryType } from "@/types/settings/manager.types";

/** One line for the form's log, in the order it happened. */
export interface SaveLogLine {
  message: string;
  type: LogEntryType;
}

/** The two calls the flow makes, injected so a test can drive every branch. */
export interface SaveCalls {
  saveConfig: (config: MainConfig) => Promise<SaveResult>;
  reloadBackendConfig: () => Promise<ReloadResult>;
}

export interface SaveFlowResult {
  outcome: SaveOutcome;
  log: SaveLogLine[];
  /** What configer refused, to show on the fields. Empty on every other path. */
  serverErrors: ConfigError[];
}

/*
 * A 500 is a failed write of main.json, not a refusal of the body, and it carries
 * only configer's own line. Saying "odmítl" there would send the maintainer looking
 * for a bad field that does not exist.
 */
function refusalMessage(status: number, msg: string | undefined): string {
  if (status < 500) return `Configer konfiguraci odmítl (HTTP ${status}).`;

  const detail = msg === undefined ? "" : ` ${msg}`;
  return `Configer konfiguraci nezapsal, selhal zápis souboru (HTTP ${status}).${detail}`;
}

/**
 * One press of Save, from the form's draft to what the page should do next.
 *
 * Pure apart from the two injected calls: it decides nothing about Vue. The caller
 * writes the log lines, puts `serverErrors` on the fields, and on an outcome that
 * reached configer remembers the banner and reloads the panel — including after a
 * failed backend reload, because the reload is what makes the panel-tier changes
 * take effect.
 *
 * The whole config goes in one PATCH. configer deep-equals it against the running
 * one, so a save that changes nothing writes nothing.
 *
 * @param draft `buildConfig(loaded, values)`, taken before the first await so the
 * body sent matches the form as it was when Save was pressed
 * @param hasErrors `formState(...).hasErrors` for that same draft
 *
 * @example
 * const result = await runSave(draft, state.hasErrors, {
 *   saveConfig,
 *   reloadBackendConfig,
 * });
 */
export async function runSave(
  draft: DraftConfig,
  hasErrors: boolean,
  { saveConfig, reloadBackendConfig }: SaveCalls,
): Promise<SaveFlowResult> {
  const log: SaveLogLine[] = [];
  const add = (message: string, type = LogEntryType.Info) =>
    log.push({ message, type });

  const done = (
    outcome: SaveOutcome,
    serverErrors: ConfigError[] = [],
  ): SaveFlowResult => ({ outcome, log, serverErrors });

  if (hasErrors) {
    add("Formulář obsahuje chyby, neodesílám nic.", LogEntryType.Error);
    return done({ kind: "notSent" });
  }

  /*
   * The parse is here to get the typed config, not to check the draft a second
   * time: hasErrors already ran the same schema over this same draft, so this
   * branch cannot be reached. It stays as a guard, without its own errors, because
   * writing them onto the fields would print every message twice.
   */
  const parsed = parseMainConfig(draft);
  if (!parsed.ok) {
    add("Konfigurace neodpovídá schématu.", LogEntryType.Error);
    return done({ kind: "notSent" });
  }

  add("Ukládám konfiguraci do configeru");

  let saved: SaveResult;
  try {
    saved = await saveConfig(parsed.config);
  } catch {
    /*
     * The client aborted after 10 s. configer may well have written the file, so
     * the one thing we must not say is that the config was not saved.
     */
    add(
      "Configer neodpověděl včas. Konfigurace se možná uložila — načti stránku znovu a zkontroluj to.",
      LogEntryType.Error,
    );
    return done({ kind: "notSent" });
  }

  if (!saved.ok) {
    add(refusalMessage(saved.status, saved.msg), LogEntryType.Error);
    for (const error of saved.errors) {
      add(`${error.path}: ${error.msg}`, LogEntryType.Error);
    }
    return done({ kind: "rejected" }, saved.errors);
  }

  add("Konfigurace uložena", LogEntryType.Success);

  const reload = await reloadBackendConfig();
  if (!reload.ok) {
    add(
      "Backend novou konfiguraci nenačetl, restartuj ho.",
      LogEntryType.Warning,
    );
    return done({ kind: "reloadFailed" });
  }

  add("Backend načetl novou konfiguraci", LogEntryType.Success);
  return done({ kind: "applied", unapplied: reload.unapplied });
}
