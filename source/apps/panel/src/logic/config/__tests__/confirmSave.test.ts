import { type MainConfig, defaultConfig } from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import {
  type FormValues,
  formState,
  toFormValues,
} from "@/logic/config/configForm";
import { confirmQuestion, dangerousChanges } from "@/logic/config/confirmSave";

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
      "backend.port": "5010",
      "units.thermal.ip": "10.1.1.60",
      "app.password": "nové-heslo",
      "camera.ip": "10.1.1.70",
    });
    expect(paths).toEqual(["backend.port", "units.thermal.ip", "app.password"]);
  });

  /*
   * The dialog exists to stop a change the maintainer did not mean to make. Typing
   * the stored value back is not a change, so it must not ask.
   */
  it("ignores a field typed back to the value the box runs on", () => {
    const loaded = loadedConfig();
    expect(
      pathsOf(loaded, { "units.engine.ip": loaded.units.engine.ip }),
    ).toEqual([]);
  });

  it("carries the value the box runs on and the value it would move to", () => {
    const [change] = dangerousChanges(
      stateWith(loadedConfig(), { "units.engine.ip": "10.1.1.9" }),
    );
    expect(change.from).toBe("10.1.1.50");
    expect(change.to).toBe("10.1.1.9");
    expect(change.label).toBe("IP motorové jednotky");
    expect(change.reason).toContain("backend jednotku nenajde");
  });

  it("shows an empty side as a word, not as nothing", () => {
    const loaded = loadedConfig();
    loaded.units.thermal.ip = "";
    const [change] = dangerousChanges(
      stateWith(loaded, { "units.thermal.ip": "10.1.1.6" }),
    );
    expect(change.from).toBe("(prázdné)");
  });

  /* The panel runs on a screen in a hospital room. A password may not be on it. */
  it("masks both sides of a secret", () => {
    const [change] = dangerousChanges(
      stateWith(loadedConfig(), { "app.password": "nové-heslo" }),
    );
    expect(change.secret).toBe(true);
    expect(change.from).not.toContain("staré-heslo");
    expect(change.to).not.toContain("nové-heslo");
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
    expect(question).toContain("IP motorové jednotky: 10.1.1.50 → 10.1.1.9");
    expect(question).toContain("Heslo do panelu");
    expect(question).toContain("Opravdu uložit?");
  });

  it("keeps a password out of the text it shows", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), { "app.password": "nové-heslo" }),
    );
    expect(question).not.toContain("nové-heslo");
    expect(question).not.toContain("staré-heslo");
  });

  it("gives every named field its reason", () => {
    const question = confirmQuestion(
      stateWith(loadedConfig(), { "backend.port": "5010" }),
    );
    expect(question).toContain("Port: 5000 → 5010");
    expect(question).toContain(
      "Po restartu backendu bude panel na jiné adrese",
    );
  });
});
