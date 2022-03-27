import { getData } from "@/api/units";
import store from "@/store";
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
import _ from "lodash";
import { getNewState } from "./panel/state";
import { convertSDSTimeToMoment } from "./time";

export class AppManager {
  private panelLoopInterval = null;

  private async updateEngineUnit(timeout: number) {
    const ip = store.state.config.units.engine.ip;
    const postfix = store.state.config.units.postfix;
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
    const ip = store.state.config.units.thermal.ip;
    const postfix = store.state.config.units.postfix;
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
    const time = convertSDSTimeToMoment(store.state.engineUnit);
    store.commit(SET_TIME, {
      time,
    });
  }
  private updateState() {
    const newState = getNewState(store.state);
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
    const delay = store.state.config.units.requestDelay || 2000;
    const timeout = store.state.config.units.requestTimeout || 5000;
    const appState = store.state.appState;
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
  }

  initializeGlobal(): Promise<any> {
    return this.initializeConfig();
  }
}
