import {
  type MainConfig,
  defaultConfig,
  parseMainConfig,
} from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import {
  type FormValues,
  buildConfig,
  defaultFormValues,
  formState,
  toFormValues,
} from "@/logic/config/configForm";

/* A config that differs from the defaults, so a test can tell the two apart. */
function loadedConfig(): MainConfig {
  const config = defaultConfig();
  config.babybox.name = "Praha";
  config.configer.port = 6001;
  config.units.engine.ip = "10.1.1.50";
  config.units.requestDelay = 3000;
  config.startup = { branch: "main", autoUpdate: true };
  return config;
}

function stateOf(
  loaded: MainConfig,
  values: Record<string, string>,
  path: string,
) {
  const field = formState(loaded, values).fields.find(
    (f) => f.field.path === path,
  );
  if (field === undefined) throw new Error(`no field ${path}`);
  return field;
}

/*
 * buildConfig returns a draft nothing has checked, so every assertion about a built
 * value goes through the schema first. A config the schema rejects throws here.
 */
function builtConfig(loaded: MainConfig, values: FormValues): MainConfig {
  const result = parseMainConfig(buildConfig(loaded, values));
  if (!result.ok) {
    throw new Error(result.errors.map((e) => `${e.path}: ${e.msg}`).join(", "));
  }
  return result.config;
}

describe("toFormValues", () => {
  it("reads a value for every rendered field", () => {
    const values = toFormValues(loadedConfig());
    expect(values["babybox.name"]).toBe("Praha");
    expect(values["units.engine.ip"]).toBe("10.1.1.50");
    expect(values["units.voltage.addition"]).toBe("0");
    expect(values["camera.cameraType"]).toBe("dahua");
  });

  it("turns a number into the string the input holds", () => {
    expect(toFormValues(loadedConfig())["units.requestDelay"]).toBe("3000");
  });

  it("gives an unset optional field an empty input", () => {
    const loaded = loadedConfig();
    delete loaded.app.refreshRequestLimit;
    expect(toFormValues(loaded)["app.refreshRequestLimit"]).toBe("");
  });

  it("draws no field for startup", () => {
    expect(
      Object.keys(toFormValues(loadedConfig())).filter((p) =>
        p.startsWith("startup"),
      ),
    ).toEqual([]);
  });
});

describe("buildConfig", () => {
  it("writes an edited value back at its path", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "babybox.name": "Brno" };
    expect(builtConfig(loaded, values).babybox.name).toBe("Brno");
  });

  it("turns a number field back into a number", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "units.requestDelay": "4500" };
    expect(builtConfig(loaded, values).units.requestDelay).toBe(4500);
  });

  it("keeps startup untouched", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "babybox.name": "Brno" };
    expect(builtConfig(loaded, values).startup).toEqual({
      branch: "main",
      autoUpdate: true,
    });
  });

  it("does not change the config it was given", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "babybox.name": "Brno" };
    buildConfig(loaded, values);
    expect(loaded.babybox.name).toBe("Praha");
  });

  it("ignores an edit to a read-only field", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "configer.port": "7000" };
    expect(builtConfig(loaded, values).configer.port).toBe(6001);
  });

  it("drops an optional field that was cleared", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "app.refreshRequestLimit": "" };
    expect("refreshRequestLimit" in builtConfig(loaded, values).app).toBe(
      false,
    );
  });

  it("builds a config the schema accepts when nothing was edited", () => {
    const loaded = loadedConfig();
    expect(builtConfig(loaded, toFormValues(loaded))).toEqual(loaded);
  });
});

describe("formState marks a field", () => {
  it("unchanged when the input equals the stored value", () => {
    const loaded = loadedConfig();
    const field = stateOf(loaded, toFormValues(loaded), "babybox.name");
    expect(field.changed).toBe(false);
    expect(field.errors).toEqual([]);
  });

  it("changed when the input differs", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "babybox.name": "Brno" };
    expect(stateOf(loaded, values, "babybox.name").changed).toBe(true);
  });

  it("invalid when the shared schema rejects the value", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "units.requestDelay": "0" };
    expect(stateOf(loaded, values, "units.requestDelay").errors).toEqual([
      "must be at least 1",
    ]);
  });

  it("invalid when a required number is cleared", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "camera.updateDelay": "" };
    expect(stateOf(loaded, values, "camera.updateDelay").errors).toEqual([
      "must be an integer",
    ]);
  });

  it("invalid when a select gets a value outside the list", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "pc.os": "macos" };
    expect(stateOf(loaded, values, "pc.os").errors).toEqual([
      "must be one of: windows, ubuntu",
    ]);
  });

  it("invalid when a stored optional field is cleared, because no write can delete it", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "app.refreshRequestLimit": "" };
    expect(stateOf(loaded, values, "app.refreshRequestLimit").errors).toEqual([
      "Hodnotu nelze smazat, klíč se přes API odstranit nedá.",
    ]);
  });

  it("valid when an unset optional field stays empty", () => {
    const loaded = loadedConfig();
    delete loaded.app.refreshRequestLimit;
    const field = stateOf(
      loaded,
      toFormValues(loaded),
      "app.refreshRequestLimit",
    );
    expect(field.errors).toEqual([]);
    expect(field.changed).toBe(false);
  });

  it("with a warning, not an error, when an ip is not a dotted quad", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "units.thermal.ip": "jednotka" };
    const field = stateOf(loaded, values, "units.thermal.ip");
    expect(field.errors).toEqual([]);
    expect(field.warning).toBe(
      "Nevypadá to jako IPv4 adresa. Uložit to ale jde.",
    );
  });

  it("with no warning for a dotted quad", () => {
    const loaded = loadedConfig();
    const values = {
      ...toFormValues(loaded),
      "units.thermal.ip": "192.168.0.9",
    };
    expect(stateOf(loaded, values, "units.thermal.ip").warning).toBeUndefined();
  });

  it("with no warning for an ip field left empty", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "camera.ip": "" };
    expect(stateOf(loaded, values, "camera.ip").warning).toBeUndefined();
  });
});

describe("formState", () => {
  it("shows the stored value and the default next to the edited one", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "units.requestDelay": "4000" };
    const field = stateOf(loaded, values, "units.requestDelay");
    expect(field.value).toBe("4000");
    expect(field.current).toBe("3000");
    expect(field.defaultValue).toBe("2000");
  });

  it("has no errors for the config as it was loaded", () => {
    const loaded = loadedConfig();
    expect(formState(loaded, toFormValues(loaded)).hasErrors).toBe(false);
  });

  it("blocks the form when one field is invalid", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "backend.port": "70000" };
    expect(formState(loaded, values).hasErrors).toBe(true);
  });

  it("lists the changed paths", () => {
    const loaded = loadedConfig();
    const values = {
      ...toFormValues(loaded),
      "babybox.name": "Brno",
      "camera.updateDelay": "2000",
    };
    expect(formState(loaded, values).changed).toEqual([
      "babybox.name",
      "camera.updateDelay",
    ]);
  });

  it("lists no changed path for an untouched form", () => {
    const loaded = loadedConfig();
    expect(formState(loaded, toFormValues(loaded)).changed).toEqual([]);
  });

  it("never lists a read-only field as changed", () => {
    const loaded = loadedConfig();
    const values = { ...toFormValues(loaded), "configer.url": "/api/v2" };
    expect(formState(loaded, values).changed).toEqual([]);
  });
});

describe("discard and reset to defaults", () => {
  it("discard puts every input back to the loaded config", () => {
    const loaded = loadedConfig();
    const edited = {
      ...toFormValues(loaded),
      "babybox.name": "Brno",
      "units.requestDelay": "0",
    };
    expect(formState(loaded, edited).hasErrors).toBe(true);

    const discarded = toFormValues(loaded);
    expect(formState(loaded, discarded).changed).toEqual([]);
    expect(formState(loaded, discarded).hasErrors).toBe(false);
    expect(builtConfig(loaded, discarded)).toEqual(loaded);
  });

  it("reset puts every editable input on its base.json default", () => {
    const loaded = loadedConfig();
    const values = defaultFormValues(loaded);
    expect(values["babybox.name"]).toBe("Nenastaveno");
    expect(values["units.engine.ip"]).toBe("10.1.1.5");
    expect(values["units.requestDelay"]).toBe("2000");
  });

  it("reset keeps the configer address the process is running on", () => {
    const values = defaultFormValues(loadedConfig());
    expect(values["configer.port"]).toBe("6001");
  });

  it("reset builds a config the schema accepts", () => {
    const loaded = loadedConfig();
    const built = builtConfig(loaded, defaultFormValues(loaded));
    expect(formState(loaded, defaultFormValues(loaded)).hasErrors).toBe(false);
    expect(built.startup).toEqual({ branch: "main", autoUpdate: true });
  });
});
