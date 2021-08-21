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
import { Config } from "@/types/main";
import { convertSDSTimeToMoment, getCurrentTimePC } from "./time";
import { getData } from "@/api/units";
import { getNewState } from "./panel/state";
import _ from "lodash";

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

  private getConfig() {
    return require("@/assets/config/config.json");
  }

  private initializeConfig() {
    const config = this.getConfig();
    store.commit(SET_CONFIG, {
      config,
    });
  }

  startPanelLoop() {
    const delay = store.state.config.units.requestDelay || 2000;
    const timeout = store.state.config.units.requestTimeout || 5000;
    this.panelLoopInterval = setInterval(() => {
      this.updateEngineUnit(timeout);
      this.updateThermalUnit(timeout);
      this.updateState();
      this.updateWatchdogEngine(timeout);
    }, delay);
  }

  stopPanelLoop() {
    clearInterval(this.panelLoopInterval);
  }

  initializeGlobal() {
    this.initializeConfig();
  }
}
