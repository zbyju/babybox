import { getData } from "@/api/units";
import { Config, useConfigStore } from "@/pinia/configStore";
import { ref, Ref } from "vue";
import {
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  SET_CONFIG,
  SET_ENGINE_UNIT,
  SET_STATE,
  SET_THERMAL_UNIT,
  SET_TIME,
} from "@/store/mutation-types/index-types";
import { AppState, UnitsConfig } from "@/types/panel/main";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { getNewState } from "./panel/state";
import { convertSDSTimeToMoment } from "./time";
import { useAppStateStore } from "@/pinia/appStateStore";
import { EngineUnit, ThermalUnit, useUnitsStore } from "@/pinia/unitsStore";
import { Connection } from "@/types/panel/connection";
import { useConnectionStore } from "@/pinia/connectionStore";

export class AppManager {
  private panelLoopInterval = null;
  private unitsConfig: Ref<UnitsConfig>;
  private appState: Ref<AppState>;
  private engineUnit: Ref<EngineUnit>;
  private thermalUnit: Ref<ThermalUnit>;
  private connection: Ref<Connection>;

  constructor() {
    // TODO: Refactor
    const configStore = useConfigStore();
    const appStateStore = useAppStateStore();
    const unitsStore = useUnitsStore();
    const connectionStore = useConnectionStore();
    const { units } = storeToRefs(configStore);
    const { message, active } = storeToRefs(appStateStore);
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const { engineUnit: euc, thermalUnit: tuc } = storeToRefs(connectionStore);
    this.unitsConfig = units;
    this.appState = ref({ message, active });
    this.engineUnit = engineUnit;
    this.thermalUnit = thermalUnit;
    this.connection = ref({ engineUnit: euc, thermalUnit: tuc });
  }

  private async updateEngineUnit(timeout: number) {
    const ip = this.unitsConfig.value.engine.ip;
    const postfix = this.unitsConfig.value.postfix;
    try {
      const data = await getData(timeout, ip, postfix);
      store.commit(SET_ENGINE_UNIT, {
        data,
      });
      store.commit(INCREMENT_SUCCESS_ENGINE);
    } catch (err) {
      store.commit(INCREMENT_FAIL_ENGINE);
    }
  }
  private async updateThermalUnit(timeout: number) {
    const ip = this.unitsConfig.value.thermal.ip;
    const postfix = this.unitsConfig.value.postfix;
    try {
      const data = await getData(timeout, ip, postfix);
      store.commit(SET_THERMAL_UNIT, {
        data,
      });
      store.commit(INCREMENT_SUCCESS_THERMAL);
    } catch (err) {
      store.commit(INCREMENT_FAIL_THERMAL);
    }
  }
  private updateClock() {
    const time = convertSDSTimeToMoment(this.engineUnit.value);
    store.commit(SET_TIME, {
      time,
    });
  }
  private updateState() {
    const newState = getNewState(
      this.engineUnit.value,
      this.thermalUnit.value,
      this.connection.value
    );
    if (!_.isEqual(store.state.appState, newState)) {
      store.commit(SET_STATE, {
        state: newState,
      });
    }
    this.updateClock();
  }
  private async updateWatchdogEngine(timeout: number) {
    const ip = store.state.config.units.engine.ip;
    const postfix = store.state.config.units.postfixWatchdog;
    try {
      await getData(timeout, ip, postfix, false);
    } catch (err) {
      // Dont care about the error
    }
  }

  private fetchConfig() {}

  private getConfig() {
    return new Promise((resolve, reject) => {
      fetch("config/config.json")
        .then((response) => {
          return response.json();
        })
        .then((config) => {
          resolve(config);
        });
    });
  }

  private async initializeConfig() {
    const config = await this.getConfig();
    return new Promise((resolve, reject) => {
      store.commit(SET_CONFIG, {
        config,
      });
    });
  }

  async startPanelLoop() {
    const delay = this.unitsConfig.value.requestDelay || 2000;
    const timeout = this.unitsConfig.value.requestTimeout || 5000;
    const appState = this.appState.value;
    this.panelLoopInterval = setInterval(
      () => {
        this.updateEngineUnit(timeout);
        this.updateThermalUnit(timeout);
        this.updateState();
        this.updateWatchdogEngine(timeout);
      },
      appState.message ? delay / 2 : delay
    );
  }

  stopPanelLoop() {
    clearInterval(this.panelLoopInterval);
    return;
  }

  initializeGlobal(): Promise<any> {
    return this.initializeConfig();
  }
}
