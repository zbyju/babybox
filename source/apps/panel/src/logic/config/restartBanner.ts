import { type UnappliedField, configFormFields } from "@babybox/config-schema";

/*
 * The save ends in window.location.reload(), which wipes every component, so the
 * banner cannot be component state. sessionStorage survives that reload in the same
 * tab and dies with the session; localStorage would still show the banner days
 * later, long after someone restarted the backend.
 */
const BANNER_KEY = "babybox.config.restartRequired";

/** What one press of Save ended up doing. */
export type SaveOutcome =
  /** Nothing left the browser: the form had errors, or configer was unreachable. */
  | { kind: "notSent" }
  /** configer refused the body. The fields it named go next to the inputs. */
  | { kind: "rejected" }
  /** configer wrote it and the backend read it again. */
  | { kind: "applied"; unapplied: UnappliedField[] }
  /** configer wrote it, the backend did not read it. */
  | { kind: "reloadFailed" };

/* The fields the backend reads, in the wording a maintainer sees on the form. */
const BACKEND_FIELDS =
  "IP jednotek, operační systém, port backendu a předpona API";

/* The Czech label the form shows for a field, so the banner prints no dotted path. */
const fieldLabels = new Map(
  configFormFields.map((field) => [field.path, field.label]),
);

function labelFor(path: string): string {
  return fieldLabels.get(path) ?? path;
}

/**
 * The line to keep across the panel reload, or null when nothing needs a restart.
 *
 * It comes from what the backend answered, not from the apply tier: if the reload
 * applied the unit IPs there is nothing left to restart for them, and if it failed
 * then every field the backend reads is still on the old value, whatever its tier
 * says.
 *
 * Only the two outcomes that reached configer can be passed in. A save that sent
 * nothing changes nothing about what needs a restart, so the caller does not write
 * the marker on those paths at all.
 */
export function bannerFor(
  outcome: Extract<SaveOutcome, { kind: "applied" } | { kind: "reloadFailed" }>,
): string | null {
  if (outcome.kind === "reloadFailed") {
    return `Backend novou konfiguraci nenačetl. Dokud ho nerestartuješ, běží dál na staré hodnotě: ${BACKEND_FIELDS}.`;
  }

  if (outcome.unapplied.length === 0) return null;

  const fields = outcome.unapplied
    .map((f) => `${labelFor(f.path)} (běží ${f.running}, uloženo ${f.stored})`)
    .join(", ");

  /*
   * In production the backend serves the panel on that port, so this tab is on the
   * old address after the restart. index.ts opens the browser on every production
   * start, so the restart lands on the new address by itself; the maintainer only
   * has to be told which one it is.
   */
  const port = outcome.unapplied.find((f) => f.path === "backend.port");
  const address =
    port === undefined
      ? ""
      : ` Panel pak poběží na http://localhost:${port.stored}.`;

  return `Restartuj backend, tyto hodnoty se použijí až potom: ${fields}.${address}`;
}

/** Writes the banner for the page to pick up after the reload; null clears it. */
export function rememberBanner(text: string | null): void {
  if (text === null) sessionStorage.removeItem(BANNER_KEY);
  else sessionStorage.setItem(BANNER_KEY, text);
}

/** The banner the last save left, or null. Reading it does not clear it. */
export function readBanner(): string | null {
  return sessionStorage.getItem(BANNER_KEY);
}

/** Drops the banner for good, for the Skrýt button. */
export function clearBanner(): void {
  sessionStorage.removeItem(BANNER_KEY);
}
