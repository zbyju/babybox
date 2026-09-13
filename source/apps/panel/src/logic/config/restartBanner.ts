import type { ConfigError, UnappliedField } from "@babybox/config-schema";

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
  /** configer refused the body and named the fields. */
  | { kind: "rejected"; errors: ConfigError[] }
  /** configer wrote it and the backend read it again. */
  | { kind: "applied"; unapplied: UnappliedField[] }
  /** configer wrote it, the backend did not read it. */
  | { kind: "reloadFailed" };

/* The fields the backend reads, in the wording a maintainer sees on the form. */
const BACKEND_FIELDS =
  "IP jednotek, operační systém, port backendu a předpona API";

/**
 * The line to keep across the panel reload, or null when nothing needs a restart.
 *
 * It comes from what the backend answered, not from the apply tier: if the reload
 * applied the unit IPs there is nothing left to restart for them, and if it failed
 * then every field the backend reads is still on the old value, whatever its tier
 * says.
 *
 * The two outcomes that send nothing return null because they change nothing about
 * what needs a restart; the caller does not write the marker on those paths at all.
 */
export function bannerFor(outcome: SaveOutcome): string | null {
  if (outcome.kind === "notSent" || outcome.kind === "rejected") return null;

  if (outcome.kind === "reloadFailed") {
    return `Backend novou konfiguraci nenačetl. Dokud ho nerestartuješ, běží dál na staré hodnotě: ${BACKEND_FIELDS}.`;
  }

  if (outcome.unapplied.length === 0) return null;

  const fields = outcome.unapplied
    .map((f) => `${f.path} (běží ${f.running}, uloženo ${f.stored})`)
    .join(", ");
  return `Restartuj backend, tyto hodnoty se použijí až potom: ${fields}.`;
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
