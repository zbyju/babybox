import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import merge from "lodash.merge";
import {
  ConfigError,
  MainConfig,
  validateMainConfig,
} from "../../types/main.types.js";

export type MainDb = ReturnType<typeof mainConfig>;

export type UpdateResult =
  | { ok: true; config: MainConfig }
  | { ok: false; errors: ConfigError[] };

export const defaultConfigDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../configs"
);

function parseFile(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as unknown;
  } catch {
    return undefined;
  }
}

/*
 * The stored config, or undefined when there is nothing usable to start from.
 * A box with a corrupt main.json must still boot: without a config neither the
 * backend nor the panel starts, and that needs someone on site.
 */
function loadStored(mainFile: string, backupFile: string): unknown {
  if (!existsSync(mainFile)) return undefined;

  const stored = parseFile(mainFile);
  if (stored !== undefined) return stored;

  console.warn(`${mainFile} does not parse, falling back to ${backupFile}`);
  const backup = parseFile(backupFile);
  if (backup !== undefined) return backup;

  console.error(`${backupFile} does not parse either, starting from base.json`);
  return undefined;
}

export async function mainConfig(configDir: string = defaultConfigDir) {
  const mainFile = join(configDir, "main.json");
  const backupFile = join(configDir, "main.json.bak");
  const tempFile = join(configDir, "main.json.tmp");

  const baseText = readFileSync(join(configDir, "base.json"), "utf-8");
  const freshBase = (): unknown => JSON.parse(baseText) as unknown;

  function write(config: MainConfig): void {
    /*
     * Only back up a file we could read. A corrupt main.json must never
     * overwrite a good main.json.bak.
     */
    if (parseFile(mainFile) !== undefined) copyFileSync(mainFile, backupFile);

    const handle = openSync(tempFile, "w");
    try {
      writeFileSync(handle, JSON.stringify(config, null, 2));
      fsyncSync(handle);
    } finally {
      closeSync(handle);
    }
    renameSync(tempFile, mainFile);
  }

  // Boot is not validated on purpose; an odd stored value must not stop the box.
  let data = merge(freshBase(), loadStored(mainFile, backupFile)) as MainConfig;
  write(data);

  /*
   * A full replace. The body is filled in from base.json first, so a client that
   * leaves a key out gets the default, never a missing key.
   */
  async function update(body: unknown): Promise<UpdateResult> {
    // lodash.merge would spread a string or an array over the defaults.
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, errors: [{ path: "", msg: "must be an object" }] };
    }

    const merged = merge(freshBase(), body);
    const errors = validateMainConfig(merged);
    if (errors.length > 0) return { ok: false, errors };

    data = merged as MainConfig;
    write(data);
    return { ok: true, config: data };
  }

  return {
    data: () => data,
    update,
  };
}
