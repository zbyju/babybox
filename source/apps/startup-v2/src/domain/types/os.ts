/**
 * Operating system detection and configuration types.
 */

export type OperatingSystem =
  | { readonly kind: "ubuntu" }
  | { readonly kind: "windows" }
  | { readonly kind: "mac" };

export type OsKind = OperatingSystem["kind"];

// Constructor functions
export const OS = {
  ubuntu: (): OperatingSystem => ({ kind: "ubuntu" }),
  windows: (): OperatingSystem => ({ kind: "windows" }),
  mac: (): OperatingSystem => ({ kind: "mac" }),
} as const;

// Type guard
export function isOsKind(value: string): value is OsKind {
  return value === "ubuntu" || value === "windows" || value === "mac";
}
