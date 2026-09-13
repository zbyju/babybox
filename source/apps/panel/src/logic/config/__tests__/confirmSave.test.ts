import { type MainConfig, defaultConfig } from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import {
  type FormValues,
  formState,
  toFormValues,
} from "@/logic/config/configForm";
import {
  confirmQuestion,
  dangerousChanges,
  nextSaveStep,
  SECRET_CHANGED,
  SECRET_CLEARED,
} from "@/logic/config/confirmSave";

/* A config that differs from the defaults, so a test can tell the two apart. */
function loadedConfig(): MainConfig {
  const config = defaultConfig();
  config.units.engine.ip = "10.1.1.50";
  config.app.password = "staré-heslo";
  return config;
}

/** The form as it is drawn for `loaded`, with `edits` typed over it. */
function stateWith(loaded: MainConfig, edits: FormValues) {
  return formState(loaded, { ...toFormValues(loaded), ...edits });
}

function pathsOf(loaded: MainConfig, edits: FormValues): string[] {
  return dangerousChanges(stateWith(loaded, edits)).map((c) => c.path);
}

function changeOf(loaded: MainConfig, edits: FormValues, path: string) {
  const change = dangerousChanges(stateWith(loaded, edits)).find(
    (c) => c.path === path,
  );
  if (change === undefined) throw new Error(`no dangerous change for ${path}`);
  return change;
}

/** The change for a field whose value is printed, failing if it is a secret. */
function shownChange(loaded: MainConfig, edits: FormValues, path: string) {
  const change = changeOf(loaded, edits, path);
  if (change.secret) throw new Error(`${path} is a secret`);
  return change;
}

/** The change for a secret field, failing if the field prints its value. */
function secretChange(loaded: MainConfig, edits: FormValues, path: string) {
  const change = changeOf(loaded, edits, path);
  if (!change.secret) throw new Error(`${path} is not a secret`);
  return change;
}

describe("dangerousChanges", () => {
  it("finds nothing in a form nobody touched", () => {
    expect(pathsOf(loadedConfig(), {})).toEqual([]);
  });

  it("finds nothing when only a harmless field changed", () => {
    expect(pathsOf(loadedConfig(), { "babybox.name": "Brno" })).toEqual([]);
  });

  it("names a unit ip that moved", () => {
    expect(pathsOf(loadedConfig(), { "units.engine.ip": "10.1.1.9" })).toEqual([
      "units.engine.ip",
    ]);
  });

  it("names every dangerous field of one save, in the form's order", () => {
    const paths = pathsOf(loadedConfig(), {
      "app.password": "nové-heslo",
      "camera.ip": "10.1.1.70",
      "units.thermal.ip": "10.1.1.60",
      "backend.port": "5010",
    });
    expect(paths).toEqual(["backend.port", "units.thermal.ip", "app.password"]);
  });

  it("ignores a field typed back to the value the box runs on", () => {
    const loaded = loadedConfig();
    expect(
      pathsOf(loaded, { "units.engine.ip": loaded.units.engine.ip }),
    ).toEqual([]);
  });

  it("carries the value the box runs on and the value it would move to", () => {
    const change = shownChange(
      loadedConfig(),
      { "units.engine.ip": "10.1.1.9" },
      "units.engine.ip",
    );
    expect(change.from).toBe("„10.1.1.50“");
    expect(change.to).toBe("„10.1.1.9“");
    expect(change.label).toBe("IP motorové jednotky");
    expect(change.reason).toContain("backend jednotku nenajde");
  });

  it("shows a cleared value as (prázdné)", () => {
    const change = shownChange(
      loadedConfig(),
      { "units.engine.ip": "" },
      "units.engine.ip",
    );
    expect(change.from).toBe("„10.1.1.50“");
    expect(change.to).toBe("(prázdné)");
  });

  /* A trailing space on an ip is the slip this whole feature exists to catch. */
  it("shows a space typed onto the end of an ip", () => {
    const change = shownChange(
      loadedConfig(),
      { "units.engine.ip": "10.1.1.50 " },
      "units.engine.ip",
    );
    expect(change.from).toBe("„10.1.1.50“");
    expect(change.to).toBe("„10.1.1.50 “");
    expect(change.to).not.toBe(change.from);
  });

  /* The panel runs on a screen in a hospital room. A password may not be on it. */
  it("carries no value at all for a secret that moves", () => {
    const change = secretChange(
      loadedConfig(),
      { "app.password": "nové-heslo" },
      "app.password",
    );
    expect(change.cleared).toBe(false);
    expect(Object.keys(change).sort()).toEqual([
      "cleared",
      "label",
      "path",
      "reason",
      "secret",
    ]);
  });

  it("tells a deleted password apart from a changed one", () => {
    const change = secretChange(
      loadedConfig(),
      { "app.password": "" },
      "app.password",
    );
    expect(change.cleared).toBe(true);
  });
});

describe("confirmQuestion", () => {
  it("asks nothing about a routine save", () => {
    expect(
      confirmQuestion(stateWith(loadedConfig(), { "camera.ip": "10.1.1.9" })),
    ).toBe(null);
  });

  it("asks once for the whole save, naming every dangerous field", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), {
        "units.engine.ip": "10.1.1.9",
        "app.password": "nové-heslo",
      }),
    );
    expect(question).not.toBe(null);
    expect(question).toContain(
      "IP motorové jednotky: „10.1.1.50“ → „10.1.1.9“",
    );
    expect(question).toContain("Heslo do panelu");
    expect(question).toContain("Opravdu uložit?");
  });

  it("says a password is changing, without printing it", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), { "app.password": "nové-heslo" }),
    );
    expect(question).toContain(`Heslo do panelu: ${SECRET_CHANGED}`);
    expect(question).not.toContain("nové-heslo");
    expect(question).not.toContain("staré-heslo");
  });

  it("says a password is being deleted, without printing the old one", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), { "app.password": "" }),
    );
    expect(question).toContain(`Heslo do panelu: ${SECRET_CLEARED}`);
    expect(question).not.toContain(SECRET_CHANGED);
    expect(question).not.toContain("staré-heslo");
  });

  it("gives every named field its reason", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), { "backend.port": "5010" }),
    );
    expect(question).toContain("Port: „5000“ → „5010“");
    expect(question).toContain(
      "Po restartu backendu bude panel na jiné adrese",
    );
  });
});

describe("nextSaveStep", () => {
  it("sends a save that changed nothing dangerous", () => {
    const state = stateWith(loadedConfig(), { "camera.ip": "10.1.1.9" });
    expect(nextSaveStep(state, null)).toEqual({ kind: "proceed" });
  });

  /* runSave stops on hasErrors and says so, so asking first would ask for nothing. */
  it("sends a save the form already blocks, without asking", () => {
    const state = stateWith(loadedConfig(), {
      "units.engine.ip": "10.1.1.9",
      "units.requestDelay": "0",
    });
    expect(state.hasErrors).toBe(true);
    expect(nextSaveStep(state, null)).toEqual({ kind: "proceed" });
  });

  it("asks on the first press of a dangerous save", () => {
    const state = stateWith(loadedConfig(), { "units.engine.ip": "10.1.1.9" });
    expect(nextSaveStep(state, null)).toEqual({
      kind: "ask",
      question: confirmQuestion(state),
    });
  });

  it("sends on the second press of the same question", () => {
    const state = stateWith(loadedConfig(), { "units.engine.ip": "10.1.1.9" });
    expect(nextSaveStep(state, confirmQuestion(state))).toEqual({
      kind: "proceed",
    });
  });

  it("asks again when another dangerous field changed while it was asking", () => {
    const loaded = loadedConfig();
    const asked = confirmQuestion(
      stateWith(loaded, { "units.engine.ip": "10.1.1.9" }),
    );
    const state = stateWith(loaded, {
      "units.engine.ip": "10.1.1.9",
      "backend.port": "5010",
    });

    const step = nextSaveStep(state, asked);
    expect(step).toEqual({ kind: "ask", question: confirmQuestion(state) });
    if (step.kind !== "ask") throw new Error("expected an ask");
    expect(step.question).toContain("Port: „5000“ → „5010“");
  });
});
