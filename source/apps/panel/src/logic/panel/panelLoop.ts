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

type LoopUnit = "engine" | "thermal";

export class AppManager {
  private loopTimers: Record<LoopUnit, Maybe<ReturnType<typeof setTimeout>>> = {
    engine: undefined,
    thermal: undefined,
  };
  private panelLoopRunning = false;
  /*
   * Bumped on every start and stop.
   * A tick that was awaiting `runTick()` across a stop belongs to an old
   * generation and must not schedule a timer, or the unit ends up with two
   * chains and only one of them in `loopTimers`.
   */
  private loopGeneration = 0;
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

  private async getVersions(): Promise<Versions> {
    const { data } = await requestJson(`${CONFIGER_API_URL}/version`, {
      timeout: CONFIGER_TIMEOUT,
    });
    /*
     * A body that is valid JSON but not a versions file would otherwise reach
     * the store, and the panel would report config success with blank version
     * fields.
     */
    if (!isInstanceOfVersions(data)) throw "Versions file error";
    return data;
  }

  private async initializeConfig() {
    const config = await this.getConfig();
    const versions = await this.getVersions();
    if (isInstanceOfConfig(config)) {
      this.configStore.setConfig(config);
      this.versionsStore.setVersions(versions);
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
    // Engine data and the watchdog talk to the same unit, so they go in sequence.
    await this.updateEngineUnit();
    await this.updateWatchdogEngine();
    this.updateState();
    this.checkRefreshLimit();
  }

  private async runThermalTick() {
    await this.updateThermalUnit();
    this.updateState();
    this.checkRefreshLimit();
  }

  /*
   * Runs one chain per unit.
   * The next round of a chain starts only after the current one settles,
   * so a slow or unreachable unit never gets a second request on top of the first.
   * The two units are separate devices on separate IPs,
   * so they get separate chains and a dead engine unit cannot slow the
   * temperature readings.
   */
  private startUnitLoop(unit: LoopUnit, runTick: () => Promise<void>) {
    const generation = this.loopGeneration;

    const tick = async () => {
      if (generation !== this.loopGeneration) return;

      try {
        await runTick();
      } catch (err) {
        console.log(err);
      }

      /*
       * The next timer is set even after a throw.
       * A self-scheduling chain that skips it stops for good, and the panel
       * keeps rendering the last values with no watchdog and no error.
       */
      if (generation === this.loopGeneration) {
        this.loopTimers[unit] = setTimeout(tick, this.nextDelay());
      }
    };

    tick();
  }

  async startPanelLoop() {
    if (this.panelLoopRunning) return;
    this.panelLoopRunning = true;
    this.loopGeneration += 1;

    this.startUnitLoop("engine", () => this.runEngineTick());
    this.startUnitLoop("thermal", () => this.runThermalTick());
  }

  stopPanelLoop() {
    this.panelLoopRunning = false;
    this.loopGeneration += 1;
    for (const unit of Object.keys(this.loopTimers) as LoopUnit[]) {
      const timer = this.loopTimers[unit];
      if (timer !== undefined) {
        clearTimeout(timer);
        this.loopTimers[unit] = undefined;
      }
    }
  }
}
