/**
 * One field the backend read from the file but a listening process cannot change.
 *
 * The wire contract of the backend's `POST /reload`: it fills the list, the panel
 * reads it and turns it into the "restart required" banner. Written once here so a
 * renamed field breaks the compile instead of quietly emptying the banner.
 *
 * Only `backend.port` and `backend.url` can be in it today; both are bound when the
 * server starts listening.
 *
 * @example
 * const unapplied: UnappliedField[] = [
 *   { path: "backend.port", running: 5000, stored: 5050 },
 * ];
 */
export interface UnappliedField {
  /** Dotted path into `MainConfig`, for example `backend.port`. */
  path: string;
  /** What the process is really on. */
  running: string | number;
  /** What the file now holds. */
  stored: string | number;
}
