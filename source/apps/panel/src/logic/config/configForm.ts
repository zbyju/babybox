import {
  type ConfigError,
  type FormField,
  type MainConfig,
  configFormFields,
  defaultConfig,
  validateMainConfig,
} from "@babybox/config-schema";
import cloneDeep from "lodash/cloneDeep";

/** Every rendered field's value, keyed by its dotted path, as the input holds it. */
export type FormValues = Record<string, string>;

type Fields = Record<string, unknown>;

/** Four numbers 0-255. Also used as the `pattern` of the ip input. */
export const IPV4_PATTERN =
  "((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";

const IPV4 = new RegExp(`^${IPV4_PATTERN}$`);

const NOT_AN_IP = "Nevypadá to jako IPv4 adresa. Uložit to ale jde.";

const CANNOT_CLEAR = "Hodnotu nelze smazat, klíč se přes API odstranit nedá.";

/* The two configer address fields; the API refuses to write them. */
const editableFields = configFormFields.filter((field) => !field.readOnly);

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(source: Fields, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) => (isFields(value) ? value[key] : undefined),
      source,
    );
}

function writePath(target: Fields, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop();
  if (last === undefined) return;

  let node = target;
  for (const key of keys) {
    const next = node[key];
    if (!isFields(next)) return;
    node = next;
  }

  if (value === undefined) delete node[last];
  else node[last] = value;
}

function toInput(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/*
 * An empty required number becomes NaN, which the schema rejects as "must be an
 * integer", so a cleared field shows an error next to itself instead of silently
 * saving a zero.
 */
function toStored(field: FormField, raw: string): unknown {
  if (field.widget !== "number") return raw;
  const trimmed = raw.trim();
  if (trimmed === "") return field.optional ? undefined : Number.NaN;
  return Number(trimmed);
}

/** The form's starting point: one input value per field, taken from the config. */
export function toFormValues(config: MainConfig): FormValues {
  const source = config as unknown as Fields;
  const values: FormValues = {};
  for (const field of configFormFields) {
    values[field.path] = toInput(readPath(source, field.path));
  }
  return values;
}

/**
 * The defaults for every field a write can change.
 *
 * `configer.port` and `configer.url` keep the running values, because the API
 * refuses to move them and a default shown there would be a value the box is not on.
 */
export function defaultFormValues(loaded: MainConfig): FormValues {
  const defaults = toFormValues(defaultConfig());
  const current = toFormValues(loaded);
  const values: FormValues = {};
  for (const field of configFormFields) {
    values[field.path] = field.readOnly
      ? current[field.path]
      : defaults[field.path];
  }
  return values;
}

/**
 * The loaded config with every edited field written over it.
 *
 * Keys the form does not render are carried through untouched, which is how
 * `startup` survives a round trip: the schema takes any key there, so the form
 * draws no row for it and this function never writes to it.
 */
export function buildConfig(
  loaded: MainConfig,
  values: FormValues,
): MainConfig {
  const next = cloneDeep(loaded) as unknown as Fields;
  for (const field of editableFields) {
    writePath(next, field.path, toStored(field, values[field.path] ?? ""));
  }
  return next as unknown as MainConfig;
}

/** The fields whose input differs from the loaded config. Read-only fields never do. */
export function changedPaths(loaded: MainConfig, values: FormValues): string[] {
  const current = toFormValues(loaded);
  return editableFields
    .filter((field) => (values[field.path] ?? "") !== current[field.path])
    .map((field) => field.path);
}

export interface FieldState {
  field: FormField;
  /** What the input holds now. */
  value: string;
  /** What the box is running on. */
  current: string;
  /** What `base.json` would give this field. */
  defaultValue: string;
  changed: boolean;
  /** Blocks a save. Every message the schema gave for this path. */
  errors: string[];
  /** Does not block a save. */
  warning?: string;
}

export interface FormState {
  fields: FieldState[];
  /** Schema errors that belong to no rendered field. A stored key nobody drew. */
  otherErrors: ConfigError[];
  changed: string[];
  hasErrors: boolean;
}

/**
 * Everything the form needs to draw itself: per field the three values, whether it
 * changed, and what the shared schema says about it.
 *
 * The schema runs once over the whole edited config, so a field sees only its own
 * errors and the maintainer reads them next to the input that caused them.
 *
 * @example
 * const state = formState(loaded, values);
 * if (!state.hasErrors) save(buildConfig(loaded, values));
 */
export function formState(loaded: MainConfig, values: FormValues): FormState {
  const current = toFormValues(loaded);
  const defaults = toFormValues(defaultConfig());

  const schemaErrors = validateMainConfig(buildConfig(loaded, values));
  const byPath = new Map<string, string[]>();
  for (const error of schemaErrors) {
    byPath.set(error.path, [...(byPath.get(error.path) ?? []), error.msg]);
  }

  const fields = configFormFields.map((field): FieldState => {
    const value = values[field.path] ?? "";
    const errors = [...(byPath.get(field.path) ?? [])];

    /*
     * No write can remove a key: a PATCH merges and a PUT fills the key from
     * base.json. So clearing a field that holds a value is a save that cannot work.
     */
    if (field.optional && value.trim() === "" && current[field.path] !== "") {
      errors.push(CANNOT_CLEAR);
    }

    const warning =
      field.widget === "ip" && value !== "" && !IPV4.test(value)
        ? NOT_AN_IP
        : undefined;

    return {
      field,
      value,
      current: current[field.path],
      defaultValue: defaults[field.path],
      changed: !field.readOnly && value !== current[field.path],
      errors,
      warning,
    };
  });

  const drawn = new Set(configFormFields.map((field) => field.path));
  const otherErrors = schemaErrors.filter((error) => !drawn.has(error.path));

  return {
    fields,
    otherErrors,
    changed: fields.filter((f) => f.changed).map((f) => f.field.path),
    hasErrors:
      fields.some((f) => f.errors.length > 0) || otherErrors.length > 0,
  };
}
