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
import {
  ConfigError,
  MainConfig,
  parseMainConfig,
  validateMainConfig,
} from "@babybox/config-schema";
import merge from "lodash.merge";

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

type CheckedBody =
  | { ok: true; body: Fields }
  | { ok: false; errors: ConfigError[] };

/*
 * Both writers merge the body over something, and lodash.merge spreads a string
 * or an array over the target, so neither may reach the merge.
 * express.json() also leaves req.body as {} when the Content-Type is not JSON:
 * without this a PUT with a forgotten header would reset the whole box to
 * base.json, and a PATCH would rewrite the file for nothing.
 * It returns the narrowed body, so the merge never takes an unknown.
 */
function checkBody(body: unknown): CheckedBody {
  if (!isPlainObject(body))
    return { ok: false, errors: [{ path: "", msg: "must be an object" }] };
  if (Object.keys(body).length === 0)
    return { ok: false, errors: [{ path: "", msg: "must not be empty" }] };
  return { ok: true, body };
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
   * index.ts binds these two once when it starts, and nothing else reads them: the
   * backend (fetch/constants.ts) and the panel (api/base.ts) have the address
   * compiled in. Storing another one would send the box to a configer nobody talks
   * to after the next restart: the backend would retry fetchConfig() forever, never
   * reach app.listen, and in production that process serves the panel too. Fixing
   * that needs someone on site, so the field changes in main.json and by a restart.
   * A body that repeats the running values changes nothing and passes.
   */
  function rejectAddressChange(config: MainConfig): ConfigError[] {
    const running = data.configer;
    return (["port", "url"] as const)
      .filter((field) => config.configer[field] !== running[field])
      .map((field) => ({
        path: `configer.${field}`,
        msg: `must stay ${String(
          running[field]
        )}: it changes only by editing main.json and restarting configer`,
      }));
  }

  // The one path that changes the config, so PUT and PATCH cannot drift apart.
  function save(merged: Fields): UpdateResult {
    const parsed = parseMainConfig(merged);
    if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

    const blocked = rejectAddressChange(parsed.config);
    if (blocked.length > 0) return { status: "invalid", errors: blocked };

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

  /*
   * A full replace. The body is filled in from base.json first, so a client that
   * leaves a key out gets the default, never a missing key.
   */
  async function update(body: unknown): Promise<UpdateResult> {
    const checked = checkBody(body);
    if (!checked.ok) return { status: "invalid", errors: checked.errors };

    return save(merge(freshBase(), checked.body));
  }

  /*
   * A partial update. The body is merged over the config we are running, so a key
   * the body leaves out keeps the value it has now. That is the whole difference
   * from update(), where the same missing key goes back to its base.json default.
   *
   * The merge cannot delete a key, and it cannot fix one either: a stored value the
   * schema rejects (boot only warns about it) makes every patch fail until someone
   * sends that field a valid value.
   */
  async function patch(body: unknown): Promise<UpdateResult> {
    const checked = checkBody(body);
    if (!checked.ok) return { status: "invalid", errors: checked.errors };

    return save(merge({}, data, checked.body));
  }

  return {
    data: () => data,
    update,
    patch,
  };
}
