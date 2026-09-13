import type { FieldState, FormState } from "@/logic/config/configForm";

/** Shown when a field holds no value, so the dialog never prints an empty side. */
const EMPTY = "(prázdné)";

/** Stands in for a secret's value, which must not go on a screen in a hospital. */
const HIDDEN = "mění se, hodnota se nezobrazuje";

export interface DangerousChange {
  path: string;
  label: string;
  /** The field's `confirm` text: why this change can cut the box off. */
  reason: string;
  /** What the box runs on now, and what the form would save. */
  from: string;
  to: string;
  /** A secret, so `from` and `to` are masked rather than real values. */
  secret: boolean;
}

function shown(value: string): string {
  return value.trim() === "" ? EMPTY : value;
}

function toChange(state: FieldState): DangerousChange {
  const { field } = state;
  const secret = field.secret === true;

  return {
    path: field.path,
    label: field.label,
    reason: field.confirm ?? "",
    from: secret ? HIDDEN : shown(state.current),
    to: secret ? HIDDEN : shown(state.value),
    secret,
  };
}

/**
 * The fields carrying a `confirm` whose value the maintainer actually changed.
 *
 * In the form's order, so the dialog reads top to bottom like the page. Empty when
 * the save is routine, which is the normal case and shows no dialog at all.
 *
 * @example
 * const risky = dangerousChanges(formState(loaded, values));
 */
export function dangerousChanges(state: FormState): DangerousChange[] {
  return state.fields
    .filter((f) => f.changed && f.field.confirm !== undefined)
    .map(toChange);
}

function line(change: DangerousChange): string {
  const values = change.secret
    ? `${change.label}: ${change.from}`
    : `${change.label}: ${change.from} → ${change.to}`;
  return `• ${values}\n  ${change.reason}`;
}

/**
 * The one question to ask before a save, or `null` when nothing risky changed.
 *
 * One dialog for the whole save, not one per field: the form sends every field in a
 * single PATCH, so five dialogs would ask five times about one action. It names each
 * dangerous field that really changed, with the value the box runs on and the value
 * it would move to, so the answer does not depend on remembering what was typed.
 *
 * A secret is named but never printed. Call it only when the form has no errors;
 * a save that cannot be sent has nothing to confirm.
 *
 * @example
 * const question = confirmQuestion(state);
 * if (question !== null && !window.confirm(question)) return;
 */
export function confirmQuestion(state: FormState): string | null {
  const changes = dangerousChanges(state);
  if (changes.length === 0) return null;

  return [
    "Měníš nastavení, po kterém se babybox může stát nedostupným:",
    "",
    changes.map(line).join("\n\n"),
    "",
    "Opravdu uložit?",
  ].join("\n");
}
