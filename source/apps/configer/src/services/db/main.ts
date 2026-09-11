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

/*
 * A rename is durable only once the directory entry is on disk too. ext4 commits
 * it on its own schedule, so a power cut soon after the rename could leave the
 * old main.json in place with the new one still in main.json.tmp.
 * Windows cannot open a directory for fsync, and base.json ships pc.os: windows.
 */
function syncDir(dir: string): void {
  if (process.platform === "win32") return;
  const handle = openSync(dir, "r");
  try {
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
}

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
function loadStored(
  mainFile: string,
  backupFile: string,
  corruptFile: string
): unknown {
  if (!existsSync(mainFile)) return undefined;

  const stored = parseFile(mainFile);
  if (stored !== undefined) return stored;

  /*
   * Boot rewrites main.json straight after this, so the unreadable file would be
   * gone. Until the UI ships main.json is edited by hand on every box, and a typo
   * plus a restart is a normal event; keep the edit for someone to recover from.
   */
  copyFileSync(mainFile, corruptFile);
  console.warn(
    `${mainFile} does not parse, kept as ${corruptFile}, falling back to ${backupFile}`
  );
  const backup = parseFile(backupFile);
  if (backup !== undefined) return backup;

  console.error(`${backupFile} does not parse either, starting from base.json`);
  return undefined;
}

export async function mainConfig(configDir: string = defaultConfigDir) {
  const mainFile = join(configDir, "main.json");
  const backupFile = join(configDir, "main.json.bak");
  const tempFile = join(configDir, "main.json.tmp");
  const corruptFile = join(configDir, "main.json.corrupt");

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
    syncDir(configDir);
  }

  // Boot is not validated on purpose; an odd stored value must not stop the box.
  let data = merge(
    freshBase(),
    loadStored(mainFile, backupFile, corruptFile)
  ) as MainConfig;
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
    /*
     * express.json() leaves req.body as {} when the Content-Type is not JSON, so a
     * PUT with a forgotten header would merge nothing and reset the whole box to
     * base.json. A real reset sends the full default body.
     */
    if (Object.keys(body).length === 0) {
      return { ok: false, errors: [{ path: "", msg: "must not be empty" }] };
    }

    const merged = merge(freshBase(), body) as MainConfig;
    const errors = validateMainConfig(merged);
    if (errors.length > 0) return { ok: false, errors };

    // Disk first: memory must never hold a config the disk does not have.
    write(merged);
    data = merged;
    return { ok: true, config: data };
  }

  return {
    data: () => data,
    update,
  };
}
