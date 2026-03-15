/**
 * Version information.
 * Updated during release process.
 */

export const VERSION = "2.0.0";
export const BUILD_DATE = "2026-03-15";
export const GIT_COMMIT = process.env.GIT_COMMIT ?? "development";

export function getVersionInfo(): string {
  return `v${VERSION} (${BUILD_DATE}, ${GIT_COMMIT.slice(0, 7)})`;
}

export function getVersionString(): string {
  return `Babybox Startup v${VERSION}`;
}
