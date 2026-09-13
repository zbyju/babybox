import type { FieldState, FormState } from "@/logic/config/configForm";

/** Shown when a field holds no value, so the dialog never prints an empty side. */
const EMPTY = "(prázdné)";

/** Stands in for a secret that moves to another value. */
export const SECRET_CHANGED = "mění se, hodnota se nezobrazuje";

/** Stands in for a secret that is being emptied. */
export const SECRET_CLEARED = "maže se, zůstane prázdné";

export type DangerousChange = {
  path: string;
  label: string;
  /** The field's `confirm` text. */
  reason: string;
} & (
  | {
      secret: false;
      /** What the box runs on now, and what the form would save. */
      from: string;
      to: string;
    }
  /* No value is carried at all, so nothing can put it on a screen in a hospital. */
  | { secret: true; cleared: boolean }
);

/*
 * Only the exact empty string counts as empty. Everything else is quoted, so a
 * trailing space on an ip is visible instead of reading like the value beside it.
 */
function displayValue(value: string): string {
  return value === "" ? EMPTY : `„${value}“`;
}

function toChange(state: FieldState, reason: string): DangerousChange {
  const { field } = state;
  const shared = { path: field.path, label: field.label, reason };

  if (field.secret === true) {
    return {
      ...shared,
      secret: true,
      cleared: state.value === "" && state.current !== "",
    };
  }

  return {
    ...shared,
    secret: false,
    from: displayValue(state.current),
    to: displayValue(state.value),
  };
}

/**
 * The fields carrying a `confirm` whose value the maintainer actually changed.
 *
 * In the form's order, so the dialog reads top to bottom like the page.
 */
export function dangerousChanges(state: FormState): DangerousChange[] {
  /*
   * flatMap, not filter then map: filter does not narrow the element type, so the
   * reason would need a fallback for a case the filter already ruled out.
   */
  return state.fields.flatMap((f) =>
    f.changed && f.field.confirm !== undefined
      ? [toChange(f, f.field.confirm)]
      : [],
  );
}

function lineFor(change: DangerousChange): string {
  const values = change.secret
    ? `${change.label}: ${change.cleared ? SECRET_CLEARED : SECRET_CHANGED}`
    : `${change.label}: ${change.from} → ${change.to}`;
  return `• ${values}\n  ${change.reason}`;
}

/**
 * The one question to ask before a save, or `null` when nothing risky changed.
 *
 * One dialog for the whole save, not one per field: the form sends every field in a
 * single PATCH, so five dialogs would ask five times about one action. It names the
 * value the box runs on and the value it would move to, so the answer does not
 * depend on remembering what was typed.
 *
 * A secret is named but never printed. Call it only when the form has no errors;
 * a save that cannot be sent has nothing to confirm.
 */
export function confirmQuestion(state: FormState): string | null {
  const changes = dangerousChanges(state);
  if (changes.length === 0) return null;

  return [
    "Měníš nastavení, po kterém se babybox může stát nedostupným:",
    "",
    changes.map(lineFor).join("\n\n"),
    "",
    "Opravdu uložit?",
  ].join("\n");
}

/** What one press of Save should do: put the question on the page, or send it. */
export type SaveStep = { kind: "ask"; question: string } | { kind: "send" };

/**
 * Turns one press of Save into the next step, given the question already on screen.
 *
 * Use it in place of a blocking dialog: the panel sends a heartbeat the backend
 * watches, so anything that stops the event loop reboots the machine.
 *
 * @param pending the question shown right now, or `null` when none is shown.
 *
 * @example
 * const step = nextSaveStep(state, pendingQuestion.value);
 * if (step.kind === "ask") pendingQuestion.value = step.question;
 */
export function nextSaveStep(
  state: FormState,
  pending: string | null,
): SaveStep {
  /* A save with errors never leaves the form, so there is nothing to ask about. */
  if (state.hasErrors) return { kind: "send" };

  const question = confirmQuestion(state);
  if (question === null) return { kind: "send" };

  /*
   * Matched as text, not as a flag, so a rewritten question asks again.
   * A backstop only: the form drops the question on any edit, because a secret's
   * line reads the same for every new value and text alone cannot tell them apart.
   */
  if (question === pending) return { kind: "send" };

  return { kind: "ask", question };
}
