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
  parseMainConfig,
  validateMainConfig,
} from "../../types/main.types.js";

export type MainDb = ReturnType<typeof mainConfig>;

export type UpdateResult =
  | { status: "saved"; config: MainConfig }
  | { status: "invalid"; errors: ConfigError[] }
  | { status: "write-failed"; msg: string };

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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Fields = Record<string, unknown>;

function isPlainObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type StoredFile =
  | { kind: "ok"; config: Fields }
  | { kind: "corrupt" }
  | { kind: "unreadable"; error: unknown };

// Only a JSON object is a config: lodash.merge would spread a string or an array.
function parseObject(text: string): Fields | undefined {
  try {
    const value = JSON.parse(text) as unknown;
    return isPlainObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function readConfigFile(file: string): StoredFile {
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch (error) {
    return { kind: "unreadable", error };
  }
  const config = parseObject(text);
  return config ? { kind: "ok", config } : { kind: "corrupt" };
}

/*
 * The stored config, or undefined when there is nothing usable to start from.
 * A box with a corrupt main.json must still boot: without a config neither the
 * backend nor the panel starts, and that needs someone on site.
 */
function loadStored(mainFile: string, backupFile: string): unknown {
  if (!existsSync(mainFile)) return undefined;

  const stored = readConfigFile(mainFile);
  if (stored.kind === "ok") return stored.config;

  if (stored.kind === "unreadable") {
    const reason = describe(stored.error);
    console.error(
      `cannot read ${mainFile}: ${reason}, falling back to ${backupFile}`
    );
  } else {
    console.warn(
      `${mainFile} is not a JSON object, falling back to ${backupFile}`
    );
  }

  const backup = readConfigFile(backupFile);
  if (backup.kind === "ok") return backup.config;

  console.error(`${backupFile} is not usable either, starting from base.json`);
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
     * Only back up a file we could read as a config. A corrupt main.json must
     * never overwrite a good main.json.bak.
     */
    if (readConfigFile(mainFile).kind === "ok") {
      copyFileSync(mainFile, backupFile);
    }

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

  /*
   * Boot only reads. Nothing on disk changes until a PUT, so main.json.bak always
   * holds the config before the last PUT, and a reboot cannot lose it.
   * Boot never rejects: an odd stored value must not stop the box. It warns, so a
   * value PUT would refuse shows in the log before the UI trips on it.
   */
  let data = merge(freshBase(), loadStored(mainFile, backupFile)) as MainConfig;
  for (const { path, msg } of validateMainConfig(data)) {
    console.warn(`${mainFile}: ${path} ${msg}`);
  }

  /*
   * A full replace. The body is filled in from base.json first, so a client that
   * leaves a key out gets the default, never a missing key.
   */
  async function update(body: unknown): Promise<UpdateResult> {
    if (!isPlainObject(body)) {
      return {
        status: "invalid",
        errors: [{ path: "", msg: "must be an object" }],
      };
    }
    /*
     * express.json() leaves req.body as {} when the Content-Type is not JSON, so a
     * PUT with a forgotten header would merge nothing and reset the whole box to
     * base.json. A real reset sends the full default body.
     */
    if (Object.keys(body).length === 0) {
      return {
        status: "invalid",
        errors: [{ path: "", msg: "must not be empty" }],
      };
    }

    const parsed = parseMainConfig(merge(freshBase(), body));
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

    // Disk first: memory must never hold a config the disk does not have.
    const config = parsed.config;
    try {
      write(config);
    } catch (error) {
      console.error(`cannot write ${mainFile}:`, error);
      return {
        status: "write-failed",
        msg: `cannot write main.json: ${describe(error)}`,
      };
    }
    data = config;
    return { status: "saved", config: data };
  }

  return {
    data: () => data,
    update,
  };
}
