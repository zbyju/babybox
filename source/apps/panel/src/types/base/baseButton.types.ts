/**
 * Visual accent of a `BaseButton`.
 * Use it when the action already maps to one of the panel colours.
 */
export const BUTTON_VARIANTS = [
  "primary",
  "success",
  "error",
  "warning",
  "accent",
] as const;

export type ButtonVariant = typeof BUTTON_VARIANTS[number];

/**
 * Footprint of a `BaseButton`.
 * Use `small` in dense rows (log, reveal). Use `card` for the settings shortcuts.
 */
export const BUTTON_SIZES = ["default", "small", "card"] as const;

export type ButtonSize = typeof BUTTON_SIZES[number];
