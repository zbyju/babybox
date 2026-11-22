import type { UnappliedField } from "../types/config.types.js";
import type { ConfigAnswer } from "../fetch/fetchConfig.js";
import { readConfig, type BackendReadableConfig } from "../fetch/readConfig.js";
export type { BackendReadableConfig } from "../fetch/readConfig.js";

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

  if (config.backend.port && config.backend.port !== Number(bound.port)) {
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

/** Read configer again and keep the current config on any failure. */
export async function reloadConfig(
  fetchConfig: () => Promise<ConfigAnswer>,
  bound: BoundAddress
): Promise<ReloadResult> {
  const answer = await readConfig(fetchConfig);
  if (answer.status === "failed") return answer;
  return {
    status: "reloaded",
    config: answer.config,
    unapplied: unappliedFields(answer.config, bound),
  };
}
