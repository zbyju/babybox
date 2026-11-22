import type { UnappliedField } from "../types/config.types.js";
import {
  backendReadableConfigSchema,
  type BackendReadableConfig,
} from "../types/configBoundary.js";

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
  | {
      status: "reloaded";
      config: BackendReadableConfig;
      unapplied: UnappliedField[];
    }
  | { status: "failed"; msg: string };

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The fields a reload read but a running process cannot take on.
 *
 * Only the two bound at listen can be in it. The port is compared as a string
 * because `PORT` from the environment is one and the config holds a number.
 */
export function unappliedFields(
  config: BackendReadableConfig,
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
  /*
   * A truthy stored prefix only. `index.ts` binds
   * `config.backend.url || process.env.API_PREFIX`, so an empty stored value is
   * never what a restart would take on, and reporting it would ask for a restart
   * that cannot change anything.
   */
  if (config.backend.url && config.backend.url !== bound.prefix) {
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
    return {
      status: "failed",
      msg: `configer request threw: ${describe(error)}`,
    };
  }

  if (!isObject(answer) || answer.data === undefined) {
    const reason = isObject(answer) ? String(answer.msg) : "no answer";
    return { status: "failed", msg: `configer returned no config: ${reason}` };
  }

  const parsed = backendReadableConfigSchema.safeParse(answer.data);
  if (!parsed.success) {
    return {
      status: "failed",
      msg: "the stored config is missing a field the backend reads",
    };
  }

  return {
    status: "reloaded",
    config: parsed.data,
    unapplied: unappliedFields(parsed.data, bound),
  };
}
