import { cameraTypes, pcOsTypes } from "./schema.js";
import type { MainConfig } from "./schema.js";

/** The input the panel renders for a field. `ip` is a text input with a pattern. */
export type FormWidget = "text" | "number" | "password" | "select" | "ip";

/**
 * What has to happen before a saved value reaches the running system.
 *
 * Each one is the tier as the system behaves today, taken from the code that reads
 * the field. The panel's config store is set once at boot and never again, so a
 * field the panel reads needs a panel reload even when the read itself is reactive.
 *
 * - `panelReload` — `window.location.reload()` after the save.
 * - `backendRestart` — the backend loads the config once at boot.
 * - `configerRestart` — configer binds the value when it starts listening. The API
 *   refuses to write these, so the only way in is editing `main.json` by hand.
 * - `none` — nothing in the repo reads the field.
 */
export type ApplyTier =
  | "panelReload"
  | "backendRestart"
  | "configerRestart"
  | "none";

/** Czech wording for each tier, shown next to a field. */
export const applyTierLabels: Record<ApplyTier, string> = {
  panelReload: "Projeví se po obnovení panelu",
  backendRestart: "Projeví se až po restartu backendu",
  configerRestart: "Projeví se až po restartu configeru",
  none: "Nikde se nepoužívá",
};

/**
 * One editable field of the config, keyed by its dotted path in `MainConfig`.
 *
 * The table is written out by hand rather than derived from the zod schema, so a
 * zod upgrade cannot move it. `form.test.ts` keeps it in step with the schema.
 */
export interface FormField {
  /** Dotted path into `MainConfig`, for example `units.engine.ip`. */
  path: string;
  label: string;
  widget: FormWidget;
  tier: ApplyTier;
  /** Allowed values for the `select` widget. */
  options?: readonly string[];
  /** Unit shown after the input, for example `ms`. */
  suffix?: string;
  hint?: string;
  /** The API refuses a write, so the panel shows the value and does not edit it. */
  readOnly?: boolean;
  /** Masked behind a reveal toggle. */
  secret?: boolean;
  /** The schema allows the key to be missing, so an empty input is a valid state. */
  optional?: boolean;
}

export interface FormSection {
  key: keyof MainConfig;
  label: string;
  hint?: string;
  fields: readonly FormField[];
}

const CONFIGER_ADDRESS_HINT =
  "Mění se jen úpravou main.json a restartem configeru. Zápis přes API je odmítnut.";

/**
 * Every field of `mainConfigSchema` the panel renders, in the order base.json has.
 *
 * `startup` is deliberately absent: the schema takes any key there, so there is no
 * field to draw. A saved config keeps whatever it holds.
 *
 * @example
 * for (const section of configForm)
 *   for (const field of section.fields) console.log(field.path, field.label);
 */
export const configForm: readonly FormSection[] = [
  {
    key: "babybox",
    label: "Babybox",
    fields: [
      {
        path: "babybox.name",
        label: "Název",
        widget: "text",
        tier: "panelReload",
        hint: "Zobrazuje se v záhlaví panelu.",
      },
    ],
  },
  {
    key: "backend",
    label: "Backend",
    fields: [
      {
        path: "backend.url",
        label: "Předpona API",
        widget: "text",
        tier: "backendRestart",
        hint: "Backend ji čte, až když začíná poslouchat.",
      },
      {
        path: "backend.port",
        label: "Port",
        widget: "number",
        tier: "backendRestart",
        hint: "Backend ho čte, až když začíná poslouchat.",
      },
      {
        path: "backend.requestTimeout",
        label: "Timeout požadavku",
        widget: "number",
        suffix: "ms",
        tier: "panelReload",
        hint: "Kolik panel čeká na odpověď backendu.",
      },
    ],
  },
  {
    key: "configer",
    label: "Configer",
    fields: [
      {
        path: "configer.url",
        label: "Předpona API",
        widget: "text",
        tier: "configerRestart",
        readOnly: true,
        hint: CONFIGER_ADDRESS_HINT,
      },
      {
        path: "configer.port",
        label: "Port",
        widget: "number",
        tier: "configerRestart",
        readOnly: true,
        hint: CONFIGER_ADDRESS_HINT,
      },
      {
        path: "configer.requestTimeout",
        label: "Timeout požadavku",
        widget: "number",
        suffix: "ms",
        tier: "none",
        hint: "Tuto hodnotu nikdo nečte. Panel i backend mají timeout na configer napevno v kódu.",
      },
    ],
  },
  {
    key: "units",
    label: "Jednotky",
    fields: [
      {
        path: "units.engine.ip",
        label: "IP motorové jednotky",
        widget: "ip",
        tier: "backendRestart",
        hint: "Backend adresu čte při startu. Odkaz v menu panelu se obnoví s panelem.",
      },
      {
        path: "units.thermal.ip",
        label: "IP topné jednotky",
        widget: "ip",
        tier: "backendRestart",
        hint: "Backend adresu čte při startu. Odkaz v menu panelu se obnoví s panelem.",
      },
      {
        path: "units.requestDelay",
        label: "Perioda dotazů",
        widget: "number",
        suffix: "ms",
        tier: "panelReload",
        hint: "Jak často se panel ptá jednotek na data.",
      },
      {
        path: "units.warningThreshold",
        label: "Práh varování",
        widget: "number",
        tier: "panelReload",
        hint: "Počet zmeškaných dotazů, po kterém se spojení hlásí jako varování.",
      },
      {
        path: "units.errorThreshold",
        label: "Práh chyby",
        widget: "number",
        tier: "panelReload",
        hint: "Počet zmeškaných dotazů, po kterém se spojení hlásí jako chyba.",
      },
      {
        path: "units.voltage.divider",
        label: "Dělitel napětí",
        widget: "number",
        tier: "panelReload",
        hint: "Přepočet syrové hodnoty z jednotky na volty.",
      },
      {
        path: "units.voltage.multiplier",
        label: "Násobitel napětí",
        widget: "number",
        tier: "panelReload",
      },
      {
        path: "units.voltage.addition",
        label: "Posun napětí",
        widget: "number",
        tier: "panelReload",
        hint: "Smí být i záporný.",
      },
    ],
  },
  {
    key: "camera",
    label: "Kamera",
    fields: [
      {
        path: "camera.ip",
        label: "IP adresa",
        widget: "ip",
        tier: "panelReload",
      },
      {
        path: "camera.username",
        label: "Uživatel",
        widget: "text",
        tier: "panelReload",
      },
      {
        path: "camera.password",
        label: "Heslo",
        widget: "password",
        tier: "panelReload",
        secret: true,
      },
      {
        path: "camera.updateDelay",
        label: "Perioda snímků",
        widget: "number",
        suffix: "ms",
        tier: "panelReload",
        hint: "Pomalejší kamera se obnovuje méně často, snímek se nepřerušuje.",
      },
      {
        path: "camera.cameraType",
        label: "Typ kamery",
        widget: "select",
        options: cameraTypes,
        tier: "panelReload",
        hint: "Určuje adresu snímku. Musí sedět přesně, jinak panel použije dahua.",
      },
    ],
  },
  {
    key: "pc",
    label: "Počítač",
    fields: [
      {
        path: "pc.os",
        label: "Operační systém",
        widget: "select",
        options: pcOsTypes,
        tier: "backendRestart",
        hint: "Backend podle něj volí příkaz pro restart počítače a čte ho při startu.",
      },
    ],
  },
  {
    key: "app",
    label: "Aplikace",
    fields: [
      {
        path: "app.password",
        label: "Heslo do panelu",
        widget: "password",
        tier: "panelReload",
        secret: true,
        hint: "Odemyká Nastavení a Konfiguraci. Kontroluje se jen v prohlížeči.",
      },
      {
        path: "app.refreshRequestLimit",
        label: "Limit dotazů do obnovení",
        widget: "number",
        tier: "panelReload",
        optional: true,
        hint: "Po tolika dotazech na jednotku se panel sám obnoví. Hodnotu nelze smazat; vypnout obnovování jde jen velkým číslem.",
      },
    ],
  },
];

/**
 * Every field of `configForm`, flattened, in the same order.
 *
 * Use it to walk the whole form; use `configForm` to draw it section by section.
 */
export const configFormFields: readonly FormField[] = configForm.flatMap(
  (section) => section.fields
);
