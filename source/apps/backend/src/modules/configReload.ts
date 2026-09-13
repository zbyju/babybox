import type { MainConfig } from "../types/config.types";

/** A field the reload read from the file but could not put into effect. */
export interface UnappliedField {
  path: string;
  running: string | number;
  stored: string | number;
}

/**
 * The address the server really bound, taken when it started listening.
 *
 * The prefix can come from `API_PREFIX` rather than from the config, and both are
 * read once. A reload has to compare the stored values against these, never against
 * `config.backend`: it is about to overwrite that, so the comparison would find a
 * value equal to itself and report every change as applied.
 */
export interface BoundAddress {
  port: string | number;
  prefix: string;
}

export type ReloadResult =
  | { status: "reloaded"; config: MainConfig; unapplied: UnappliedField[] }
  | { status: "failed"; msg: string };

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Only the five fields the backend reads, checked for the type it reads them as.
 *
 * The backend cannot run the shared zod schema: its `dist` is installed outside the
 * workspace, so the package is a type here and nothing more. This is the same trade
 * the panel makes in `utils/panel/instanceCheck.ts` — the read path checks the shape
 * it reads, and the write path in configer keeps every rule.
 *
 * It is deliberately narrow. A stored value the schema refuses but the backend never
 * touches must not stop the reload; a missing `units.engine.ip` must, because the
 * next poll would throw on it and take the panel down with the process.
 */
export function isBackendReadableConfig(value: unknown): value is MainConfig {
  if (!isObject(value)) return false;

  const { backend, pc, units } = value;
  if (!isObject(backend) || !isObject(pc) || !isObject(units)) return false;

  const { engine, thermal } = units;
  if (!isObject(engine) || !isObject(thermal)) return false;

  return (
    typeof backend.url === "string" &&
    typeof backend.port === "number" &&
    typeof pc.os === "string" &&
    typeof engine.ip === "string" &&
    typeof thermal.ip === "string"
  );
}

/**
 * The fields a reload read but a running process cannot take on.
 *
 * Only the two bound at listen can be in it. The port is compared as a string
 * because `PORT` from the environment is one and the config holds a number.
 */
export function unappliedFields(
  config: MainConfig,
  bound: BoundAddress
): UnappliedField[] {
  const unapplied: UnappliedField[] = [];

  if (String(config.backend.port) !== String(bound.port)) {
    unapplied.push({
      path: "backend.port",
      running: bound.port,
      stored: config.backend.port,
    });
  }
  if (config.backend.url !== bound.prefix) {
    unapplied.push({
      path: "backend.url",
      running: bound.prefix,
      stored: config.backend.url,
    });
  }

  return unapplied;
}

/**
 * Reads the config again and says whether the caller may swap it in.
 *
 * On any failure it returns `failed` and no config, so the caller keeps the one it
 * has. That is the whole point of the function: `fetchConfig()` answers a failure
 * with an object that has no `data` key, and assigning that would leave `config`
 * undefined. The next poll would throw on `config.units.engine.ip`, and in
 * production that same process serves the panel, so the box would serve nothing
 * while pm2 keeps it alive. Someone would have to drive to the hospital.
 *
 * @param fetchConfig `fetch/fetchConfig`, injected so a test can fail it
 * @param bound what the server is listening on, for the unapplied list
 *
 * @example
 * const result = await reloadConfig(fetchConfig, bound);
 * if (result.status === "reloaded") applyConfig(result.config);
 */
export async function reloadConfig(
  fetchConfig: () => Promise<{ data?: unknown; msg?: string }>,
  bound: BoundAddress
): Promise<ReloadResult> {
  let answer: { data?: unknown; msg?: string };
  try {
    answer = await fetchConfig();
  } catch (error) {
    return { status: "failed", msg: `configer request threw: ${describe(error)}` };
  }

  if (!isObject(answer) || answer.data === undefined) {
    const reason = isObject(answer) ? String(answer.msg) : "no answer";
    return { status: "failed", msg: `configer returned no config: ${reason}` };
  }

  if (!isBackendReadableConfig(answer.data)) {
    return {
      status: "failed",
      msg: "the stored config is missing a field the backend reads",
    };
  }

  return {
    status: "reloaded",
    config: answer.data,
    unapplied: unappliedFields(answer.data, bound),
  };
}
