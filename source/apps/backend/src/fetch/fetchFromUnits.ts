import type {
  CommonDataResponse,
  CommonResponse,
  Setting,
  SettingResult,
} from "../types/request.types.js";
import { isInstanceOfGetUnitSettingsRequest } from "../types/request.types.js";
import type { Action } from "../types/units.types.js";
import { Unit } from "../types/units.types.js";
import { actionToUnit, actionToUrl, unitToIp } from "../utils/url.js";
import { wait } from "../utils/wait.js";
import { defaultFetchTimeout } from "./constants.js";
import { fetchFromUrl } from "./fetch.js";
import { onUnit, sharedOnUnit } from "./unitGate.js";

/*
 * The panel sends no timeout. A test or a person with curl may.
 * Only a whole number of ms from 1 to 2147483647 is used.
 * Anything else is the default,
 * because axios turns a fraction below 1 into 0, which means no timeout,
 * and Node fires a longer timer after 1 ms.
 */
function queryTimeout(query: unknown): number {
  if (typeof query !== "object" || query === null || !("timeout" in query)) {
    return defaultFetchTimeout();
  }
  const timeout = Number(query.timeout);
  return Number.isInteger(timeout) && timeout >= 1 && timeout <= 2147483647
    ? timeout
    : defaultFetchTimeout();
}

export async function fetchDataCommon(
  unit: Unit,
  query: unknown
): Promise<CommonDataResponse> {
  const timeout = queryTimeout(query);

  const url = `http://${unitToIp(unit)}/get_ram[0]?rn=60`;

  try {
    const data = await sharedOnUnit(unit, `data:${timeout}`, () =>
      fetchFromUrl(url, timeout)
    );
    return {
      status: 200,
      msg: "Data fetched successfully.",
      data: data.data,
    };
  } catch (err) {
    return {
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    };
  }
}

export async function fetchSettings(
  query: unknown
): Promise<CommonDataResponse> {
  if (!isInstanceOfGetUnitSettingsRequest(query)) {
    return {
      status: 400,
      msg: "Unit was specified, but it is wrong. Expected values are: 'engine' or 'thermal'.",
    };
  }
  const { unit = "both", timeout = defaultFetchTimeout() } = query;

  const timestamp = new Date().getTime();
  const settingsUrl = (u: Unit) =>
    `http://${unitToIp(u)}/get_sys[100]?rn=16&${timestamp}`;

  /*
   * Engine and thermal are separate devices on separate IPs, each with its own
   * queue, so start both requests before awaiting either.
   * A "both" request then costs one timeout, not two.
   */
  const readSettings = (u: Unit) =>
    sharedOnUnit(u, `settings:${timeout}`, () =>
      fetchFromUrl(settingsUrl(u), timeout)
    );

  const enginePromise =
    unit === "engine" || unit === "both" ? readSettings(Unit.Engine) : null;
  const thermalPromise =
    unit === "thermal" || unit === "both" ? readSettings(Unit.Thermal) : null;

  /*
   * allSettled attaches the handler in this same tick,
   * so whichever request fails first is never left unhandled
   * while the other is still in flight.
   */
  const settle = <T>(p: T) => Promise.allSettled([p]).then(([r]) => r);
  const engineSettled = settle(enginePromise);
  const thermalSettled = settle(thermalPromise);

  /*
   * Engine is awaited and reported first, as before.
   * Awaiting it on its own also keeps the old fail-fast timing:
   * a dead engine answers straight away
   * instead of waiting out a thermal unit that hangs to its timeout.
   */
  const engineResult = await engineSettled;
  if (engineResult.status === "rejected") {
    return {
      status: 500,
      msg: "There was an error when fetching settings from engine unit.",
    };
  }

  const thermalResult = await thermalSettled;
  if (thermalResult.status === "rejected") {
    return {
      status: 500,
      msg: "There was an error when fetching settings from thermal unit.",
    };
  }

  return {
    status: 200,
    msg: "Successfully fetched settings.",
    data: {
      engine: engineResult.value === null ? null : engineResult.value.data,
      thermal: thermalResult.value === null ? null : thermalResult.value.data,
    },
  };
}

export async function fetchAction(action: Action): Promise<CommonDataResponse> {
  const timeout = defaultFetchTimeout();

  const url = actionToUrl(action);
  const unit = actionToUnit(action);

  if (url === undefined || unit === undefined) {
    return {
      status: 400,
      msg: "Unknown action.",
    };
  }

  try {
    // Operator actions jump the queue so they never wait behind polling.
    const data = await onUnit(unit, () => fetchFromUrl(url, timeout), true);
    return {
      status: 200,
      msg: "Action sent successfully.",
      data: data.data,
    };
  } catch (err) {
    return {
      status: 408,
      msg: "Request timedout. The URL/IP might be wrong, check the config.",
    };
  }
}

export async function updateWatchdog(): Promise<CommonResponse> {
  try {
    await onUnit(Unit.Engine, () =>
      fetchFromUrl(`http://${unitToIp(Unit.Engine)}/sdscep?sys141=115`)
    );
    return {
      status: 200,
      msg: "Successfully updated Watchdog.",
    };
  } catch (err) {
    return {
      status: 500,
      msg: "Watchdog update was not successful.",
    };
  }
}

/**
 * Wall-clock cap on retrying one setting.
 *
 * An attempt is one queued job of four sequential requests, so it can hold the
 * unit for four times the timeout. `tryNumber` alone lets a flaky unit keep the
 * queue for minutes, and panel reads waiting behind it time out and count as
 * failures, so the panel reports a connection problem that does not exist.
 *
 * Room for one slow attempt plus retries, and the cap is checked before a new
 * attempt, so an attempt already running is never cut off.
 */
const SETTING_RETRY_BUDGET = 30000;

export async function updateSettings(
  settings: Setting[],
  timeout = 5000,
  tryNumber = 10,
  retryBudget = SETTING_RETRY_BUDGET
): Promise<SettingResult[]> {
  const results = settings.reduce(
    async (previous: Promise<SettingResult[]>, s: Setting) => {
      const prevResult = await previous;
      const ip = unitToIp(s.unit);
      const timestamp = new Date().getTime();
      let result = false;
      let i = tryNumber;
      const giveUpAt = Date.now() + retryBudget;

      /*
       * Try to override settings tryNumber of times, or until the retry budget
       * runs out, whichever comes first.
       * One attempt is a single queued job, so nothing else reaches the unit
       * between reading readiness, writing the value and verifying it.
       */
      while (!result && i > 0 && Date.now() < giveUpAt) {
        try {
          result = await onUnit(s.unit, () =>
            updateSetting(
              `http://${ip}/sdscep?sys141=${s.index}&${timestamp}`,
              `http://${ip}/sdscep?sys140=${s.value}&${timestamp}`,
              `http://${ip}/get_sys[141]`,
              `http://${ip}/get_sys[100]?rn=16&${timestamp}`,
              s.index,
              s.value,
              timeout
            )
          );
        } catch (err) {
          /*
           * `onUnit` rejects when a job passes the queue deadline, and
           * `updateSetting` itself never rejects. The route awaits this
           * function with no catch, so an escaping rejection ends the backend
           * process. Count it as a failed attempt and let the caps stop us.
           */
          result = false;
        }
        if (result === false) {
          await wait(75);
        }
        --i;
      }
      return [...prevResult, { ...s, result }];
    },
    Promise.resolve([])
  );

  return results;
}

async function isReady(url: string, timeout = 5000) {
  try {
    const res = await fetchFromUrl(url, timeout);
    return res.data === 0;
  } catch (err) {
    return false;
  }
}

async function updateSetting(
  urlIndex: string,
  urlValue: string,
  urlReady: string,
  urlVerification: string,
  index: number,
  value: number,
  timeout = 5000
): Promise<boolean> {
  // If unit is not ready then don't send
  const ready = await isReady(urlReady, timeout);
  if (!ready) return false;

  try {
    // Send value first; then index
    const valueResult = await fetchFromUrl(urlValue, timeout);
    const indexResult = await fetchFromUrl(urlIndex, timeout);
    const verification = await fetchFromUrl(urlVerification, timeout);
    if (typeof verification.data !== "string") return false;
    const verificationArray = verification.data.split("|");
    return (
      isStatusOk(indexResult.status) &&
      isStatusOk(valueResult.status) &&
      indexResult.data === index &&
      valueResult.data === value &&
      verificationArray[index - 100] === value.toString()
    );
  } catch (err) {
    return false;
  }
}

function isStatusOk(status: number): boolean {
  return status >= 200 && status < 300;
}
