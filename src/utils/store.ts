import store from "@/store";
import {
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  SET_CONFIG,
  SET_ENGINE_UNIT,
  SET_THERMAL_UNIT,
  SET_TIME_PC,
} from "@/store/mutation-types/index-types";
import { Config } from "@/types/main";
import { useStore } from "vuex";
import { getCurrentTimePC } from "./time";
import { getData } from "@/api/units";

/**
 * Loads config from the json file
 */
const getConfig = (): Config => {
  return require("@/config.json");
};

/**
 * Gets data from the json file and updates it in store
 */
const initializeConfig = async () => {
  const config = getConfig();
  const store = useStore();
  store.commit(SET_CONFIG, {
    config,
  });
};

const initEngineUnit = async (timeout: number) => {
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
};

const initThermalUnit = async (timeout: number) => {
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
};

/**
 * Gets data from babybox and updates @data and @time in store
 */
const initializeData = () => {
  const delay = store.state.config.units.requestDelay || 2000;
  const timeout = store.state.config.units.requestTimeout || 5000;
  setInterval(() => {
    initEngineUnit(timeout);
    initThermalUnit(timeout);
  }, delay);
};

/**
 * Gets the current computer time and initilizes it
 */
const initializeClock = () => {
  const delay = store.state.config.app.colonDelay;
  setInterval(() => {
    const time = getCurrentTimePC();
    store.commit(SET_TIME_PC, {
      time,
    });
  }, delay);
};

/**
 * Initilizes the whole store
 */
export const initializeStore = async () => {
  initializeConfig();
  initializeData();
  initializeClock();
};
