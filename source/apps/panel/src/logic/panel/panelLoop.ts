import isEqual from "lodash/isEqual";
import { storeToRefs } from "pinia";
import type { Ref } from "vue";
import { ref } from "vue";

import { CONFIGER_API_URL } from "@/api/base";
import { requestJson } from "@/api/http";
import {
  getEngineData,
  getStatus,
  getThermalData,
  updateWatchdog,
} from "@/api/units";
import { useAppStateStore } from "@/pinia/appStateStore";
import { useConfigStore } from "@/pinia/configStore";
import { useConnectionStore } from "@/pinia/connectionStore";
import { usePanelStateStore } from "@/pinia/panelStateStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { useVersionsStore } from "@/pinia/versions";
import type { Maybe } from "@/types/generic.types";
import type {
  AppConfig,
  Config,
  UnitsConfig,
} from "@/types/panel/config.types";
import type { Connection } from "@/types/panel/connection.types";
import type { PanelState } from "@/types/panel/main.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";
import type { Versions } from "@/types/panel/versions.types";
import {
  isInstanceOfConfig,
  isInstanceOfVersions,
} from "@/utils/panel/instanceCheck";

import { getNewState } from "./state";

const CONFIGER_TIMEOUT = 10000;
const FIRST_INIT_DELAY = 5000;
const MAX_INIT_DELAY = 20000;

/*
 * How often the loop clock fires.
 *
 * An interval, not a chain that schedules its own next round. A chain ends the
 * moment an awaited request never settles, and this loop carries the engine
 * watchdog and the whole display, so it must keep a clock that cannot stop.
 * The clock is finer than the poll delay, so `requestDelay` and the
 * message-halving still take effect between rounds.
 */
const LOOP_TICK = 250;

type LoopUnit = "engine" | "thermal";

export class AppManager {
  private loopTimers: Record<LoopUnit, Maybe<ReturnType<typeof setInterval>>> =
    {
      engine: undefined,
      thermal: undefined,
    };
  private panelLoopRunning = false;
  /* True while a round for that unit is in flight, so the clock skips instead
   * of opening a second request to the same device. */
  private tickRunning: Record<LoopUnit, boolean> = {
    engine: false,
    thermal: false,
  };
  /*
   * When the last round for that unit settled, on the monotonic clock.
   * The gap is measured from the end of a round, so a slow unit does not get
   * its next request sooner than a fast one.
   */
  private lastTickEnd: Record<LoopUnit, number> = {
    engine: Number.NEGATIVE_INFINITY,
    thermal: Number.NEGATIVE_INFINITY,
  };
  private unitsConfig: Ref<UnitsConfig>;
  private appConfig: Ref<AppConfig>;
  private panelState: Ref<PanelState>;
  private engineUnit: Ref<Maybe<EngineUnit>>;
  private thermalUnit: Ref<Maybe<ThermalUnit>>;
  private connection: Ref<Connection>;

  private unitsStore;
  private versionsStore;
  private connectionStore;
  private configStore;
  private panelStateStore;
  private appStateStore;

  constructor() {
    // TODO: Refactor
    const configStore = useConfigStore();
    const versionsStore = useVersionsStore();
    const panelStateStore = usePanelStateStore();
    const unitsStore = useUnitsStore();
    const connectionStore = useConnectionStore();
    const appStateStore = useAppStateStore();
    const { units, app } = storeToRefs(configStore);
    const { message, active } = storeToRefs(panelStateStore);
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const { engineUnit: euc, thermalUnit: tuc } = storeToRefs(connectionStore);
    this.unitsConfig = units;
    this.appConfig = app;
    this.panelState = ref({ message, active });
    this.engineUnit = engineUnit;
    this.thermalUnit = thermalUnit;
    this.connection = ref({ engineUnit: euc, thermalUnit: tuc });

    this.unitsStore = unitsStore;
    this.versionsStore = versionsStore;
    this.connectionStore = connectionStore;
    this.configStore = configStore;
    this.panelStateStore = panelStateStore;
    this.appStateStore = appStateStore;
  }

  private async updateEngineUnit() {
    try {
      const data = await getEngineData();
      this.unitsStore.setRawEngineUnit(data);
      if (data !== undefined) {
        this.connectionStore.incrementSuccessEngine();
      } else {
        this.connectionStore.incrementFailEngine();
      }
    } catch (err) {
      this.connectionStore.incrementFailEngine();
    }
  }
  private async updateThermalUnit() {
    try {
      const data = await getThermalData();
      this.unitsStore.setRawThermalUnit(data);
      if (data !== undefined) {
        this.connectionStore.incrementSuccessThermal();
      } else {
        this.connectionStore.incrementFailThermal();
      }
    } catch (err) {
      this.connectionStore.incrementFailThermal();
    }
  }
  private updateClock() {
    const time = this.engineUnit.value?.data.time;
    this.unitsStore.setTime(time);
  }
  private updateState() {
    const newState = getNewState(
      this.engineUnit.value,
      this.thermalUnit.value,
      this.connection.value,
      this.unitsConfig.value,
    );
    if (!isEqual(this.panelState.value, newState)) {
      this.panelStateStore.setState(newState);
    }
    this.updateClock();
  }
  private async updateWatchdogEngine() {
    try {
      await updateWatchdog();
    } catch (err) {
      // Dont care about the error
    }
  }

  private checkRefreshLimit() {
    const DEFAULT_REFRESH_LIMIT = 50000;
    const limit =
      this.appConfig.value.refreshRequestLimit ?? DEFAULT_REFRESH_LIMIT;

    // Disable refresh if limit is invalid (0, negative, NaN, etc.)
    if (limit <= 0 || !Number.isFinite(limit)) {
      return;
    }

    const engineRequests = this.connectionStore.engineUnit.requests;
    const thermalRequests = this.connectionStore.thermalUnit.requests;

    if (engineRequests >= limit || thermalRequests >= limit) {
      window.location.reload();
    }
  }

  /*
   * These must reject when configer is unreachable.
   * The startup retry chain waits for them, so a promise that never settles
   * would stop the panel from ever retrying.
   */
  private async getConfig(): Promise<Config> {
    const { data } = await requestJson<Config>(`${CONFIGER_API_URL}/main`, {
      timeout: CONFIGER_TIMEOUT,
    });
    return data;
  }

  /*
   * Returns undefined on a body that is valid JSON but not a versions file.
   *
   * Versions only feed the display string in the header. Failing the config
   * step over them would keep AppState short of Ok, so MainView never mounts
   * and the panel does no polling, no watchdog and no alarms. A bad body fails
   * the same way on every retry, so that would last until someone visits.
   *
   * A request that fails still rejects, so a configer outage keeps retrying.
   */
  private async getVersions(): Promise<Maybe<Versions>> {
    const { data } = await requestJson(`${CONFIGER_API_URL}/version`, {
      timeout: CONFIGER_TIMEOUT,
    });
    if (!isInstanceOfVersions(data)) {
      console.error("Versions file error", data);
      return undefined;
    }
    return data;
  }

  private async initializeConfig() {
    const config = await this.getConfig();
    const versions = await this.getVersions();
    if (isInstanceOfConfig(config)) {
      this.configStore.setConfig(config);
      if (versions !== undefined) this.versionsStore.setVersions(versions);
      return "Ok";
    } else {
      throw "Config file error";
    }
  }

  private async initializeBackend() {
    try {
      const status = await getStatus();
      if (status) {
        return "OK";
      } else {
        throw "Status not ok";
      }
    } catch (err) {
      if (typeof err === "string") {
        throw err;
      } else {
        throw "Error when fetching backend status";
      }
    }
  }

  /*
   * Retries config and backend startup until both answer.
   * The next attempt is scheduled after the current one settles,
   * so a hanging backend cannot collect overlapping status requests.
   */
  async initializeGlobal(): Promise<any> {
    /*
     * Backs off from 5 s to 20 s.
     * The old code meant to retry at 20 s but setInterval had already captured
     * 5 s, so it stayed at 5 s. A flat 20 s would add up to 15 s of blank
     * screen with no watchdog when the backend is only a little slow to boot,
     * so the early retries stay fast and only a longer outage slows down.
     */
    let delay = FIRST_INIT_DELAY;
    /*
     * Config comes from configer and does not change while the panel boots, so
     * it is fetched once. Setting it again on a later retry would invalidate
     * every config-dependent computed.
     */
    let configOk = false;

    const attempt = async () => {
      let backendOk = false;

      if (!configOk) {
        try {
          await this.initializeConfig();
          this.appStateStore.setConfigSuccess();
          configOk = true;
        } catch (err) {
          this.appStateStore.setConfigError();
        }
      }

      try {
        await this.initializeBackend();
        this.appStateStore.setBackendSuccess();
        backendOk = true;
      } catch (err) {
        this.appStateStore.setBackendError();
      }

      if (configOk && backendOk) return;

      delay = Math.min(delay * 2, MAX_INIT_DELAY);
      setTimeout(attempt, delay);
    };

    setTimeout(attempt, FIRST_INIT_DELAY);
  }

  private nextDelay(): number {
    const delay = this.unitsConfig.value.requestDelay || 2000;
    return this.panelState.value.message ? delay / 2 : delay;
  }

  private async runEngineTick() {
    /*
     * Engine data and the watchdog talk to the same unit, so they go in
     * sequence. The watchdog goes first, so a slow data read cannot delay the
     * safety write. The engine unit blocks the babybox once that timer lapses.
     */
    await this.updateWatchdogEngine();
    await this.updateEngineUnit();
  }

  private async runThermalTick() {
    await this.updateThermalUnit();
  }

  /*
   * Runs one clock per unit.
   *
   * A round starts only when the previous round for that unit has settled, so
   * a slow or unreachable unit never gets a second request on top of the
   * first. The two units are separate devices on separate IPs, so a dead
   * engine unit cannot slow the temperature readings.
   *
   * The panel state and the refresh limit run on the clock rather than after
   * the awaited round, so a request in flight does not hold them up.
   */
  private startUnitLoop(unit: LoopUnit, runTick: () => Promise<void>) {
    const clock = () => {
      this.updateState();
      this.checkRefreshLimit();

      if (this.tickRunning[unit]) return;
      if (performance.now() - this.lastTickEnd[unit] < this.nextDelay()) return;

      this.tickRunning[unit] = true;
      runTick()
        .catch((err) => console.log(err))
        .finally(() => {
          this.tickRunning[unit] = false;
          this.lastTickEnd[unit] = performance.now();
        });
    };

    clock();
    this.loopTimers[unit] = setInterval(clock, LOOP_TICK);
  }

  async startPanelLoop() {
    if (this.panelLoopRunning) return;
    this.panelLoopRunning = true;

    this.startUnitLoop("engine", () => this.runEngineTick());
    this.startUnitLoop("thermal", () => this.runThermalTick());
  }

  stopPanelLoop() {
    this.panelLoopRunning = false;
    for (const unit of Object.keys(this.loopTimers) as LoopUnit[]) {
      const timer = this.loopTimers[unit];
      if (timer !== undefined) {
        clearInterval(timer);
        this.loopTimers[unit] = undefined;
      }
      this.tickRunning[unit] = false;
      this.lastTickEnd[unit] = Number.NEGATIVE_INFINITY;
    }
  }
}
