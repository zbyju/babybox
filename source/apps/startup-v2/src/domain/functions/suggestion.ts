/**
 * Suggestion creation functions.
 * Pure functions that create actionable suggestions based on errors.
 */

import type { DirectoryPath } from "../types/branded";
import { shellCommand } from "../types/branded";
import type {
  GitPullResult,
  BuildResult,
  OverrideResult,
  ProcessStartResult,
} from "../types/results";
import type { Suggestion } from "../types/suggestion";
import { Suggestion as S } from "../types/suggestion";

/**
 * Create suggestions for git pull failures.
 */
export function suggestionsForGitPull(
  result: GitPullResult,
  repoPath: DirectoryPath,
): readonly Suggestion[] {
  switch (result.kind) {
    case "updated":
    case "already_up_to_date":
      return [];

    case "conflict":
      return [
        S.terminalInDirectory(
          shellCommand("git stash"),
          repoPath,
          "Ulozte lokalni zmeny do stashe",
        ),
        S.terminalInDirectory(shellCommand("git pull"), repoPath, "Zkuste znovu stahnout zmeny"),
        S.terminalInDirectory(shellCommand("git stash pop"), repoPath, "Obnovte ulozene zmeny"),
      ];

    case "network_error":
      return [
        S.checkNetwork("Zkontrolujte pripojeni k internetu"),
        S.terminalGlobal(shellCommand("ping github.com"), "Overdte pripojeni k serveru"),
      ];

    case "not_a_repository":
      return [
        S.terminalInDirectory(shellCommand("git init"), repoPath, "Inicializujte git repozitar"),
        S.terminalInDirectory(
          shellCommand("git clone <url> ."),
          repoPath,
          "Naklonujte repozitar znovu",
        ),
      ];

    case "unknown_error":
      return [
        S.terminalInDirectory(shellCommand("git status"), repoPath, "Zkontrolujte stav repozitare"),
        S.terminalInDirectory(
          shellCommand("git fetch --all"),
          repoPath,
          "Zkuste stahnout metadata",
        ),
        S.contactSupport("medium", result.message, "Pokud problem pretrva, kontaktujte podporu"),
      ];
  }
}

/**
 * Create suggestions for build failures.
 */
export function suggestionsForBuild(
  result: BuildResult,
  repoPath: DirectoryPath,
): readonly Suggestion[] {
  switch (result.kind) {
    case "success":
      return [];

    case "dependency_install_failed":
      return [
        S.terminalInDirectory(
          shellCommand("rm -rf node_modules"),
          repoPath,
          "Smazte node_modules a zkuste znovu",
        ),
        S.terminalInDirectory(
          shellCommand("bun install"),
          repoPath,
          "Nainstalujte zavislosti rucne",
        ),
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkNetwork("Zkontrolujte pripojeni k npm registry"),
      ];

    case "compilation_failed":
      return [
        S.terminalInDirectory(
          shellCommand("bun run typecheck"),
          repoPath,
          "Zkontrolujte typove chyby",
        ),
        S.documentation(
          "TypeScript errors",
          "Projdete si chybove hlasky a opravte problemy ve zdrojovem kodu",
        ),
        S.contactSupport(
          "high",
          result.errors.join("; "),
          "Kompilace selhala - kontaktujte vyvojare",
        ),
      ];

    case "unknown_error":
      return [
        S.terminalInDirectory(
          shellCommand("bun run build"),
          repoPath,
          "Zkuste build spustit rucne",
        ),
        S.contactSupport(
          "medium",
          result.message,
          "Neznama chyba pri buildu - kontaktujte podporu",
        ),
      ];
  }
}

/**
 * Create suggestions for override/deployment failures.
 */
export function suggestionsForOverride(
  result: OverrideResult,
  distPath: string,
  backupPath: string,
): readonly Suggestion[] {
  switch (result.kind) {
    case "success":
    case "rollback_success":
      return [];

    case "backup_failed":
      return [
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkPermissions(distPath, `Zkontrolujte opravneni k ${distPath}`),
        S.terminalGlobal(
          shellCommand(`rm -rf ${backupPath}`),
          "Smazte starou zalohu a zkuste znovu",
        ),
      ];

    case "copy_failed":
      return [
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkPermissions(distPath, `Zkontrolujte opravneni k ${distPath}`),
      ];

    case "rollback_failed":
      return [
        S.contactSupport(
          "critical",
          `Original: ${result.originalError}, Rollback: ${result.rollbackError}`,
          "KRITICKA CHYBA: Rollback selhal! Kontaktujte okamzite podporu.",
        ),
        S.terminalGlobal(
          shellCommand(`cp -r ${backupPath} ${distPath}`),
          "Zkuste rucne obnovit ze zalohy",
        ),
        S.restartMachine("Restartujte pocitac a zkontrolujte stav"),
      ];
  }
}

/**
 * Create suggestions for process start failures.
 */
export function suggestionsForProcessStart(
  result: ProcessStartResult,
  processName: string,
): readonly Suggestion[] {
  switch (result.kind) {
    case "started":
    case "already_running":
      return [];

    case "failed":
      return [
        S.terminalGlobal(shellCommand("pm2 list"), "Zkontrolujte stav vsech procesu"),
        S.terminalGlobal(shellCommand(`pm2 logs ${processName}`), "Zkontrolujte logy procesu"),
        S.terminalGlobal(shellCommand(`pm2 delete ${processName}`), "Smazte proces a zkuste znovu"),
        S.terminalGlobal(shellCommand("pm2 kill"), "Restartujte PM2 daemon"),
      ];
  }
}
