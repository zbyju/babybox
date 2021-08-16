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
import { getNewState } from "./state";
import _ from "lodash";

/**
 * Loads config from the json file
 */
const getConfig = (): Config => {
  return require("@/config.json");
};

/**
 * Looks at the data in store and updates the state accordingly
 */
const updateState = () => {
  const newState = getNewState(store.state);
  if (!_.isEqual(store.state.appState, newState)) {
    store.commit(SET_STATE, {
      state: newState,
    });
  }
  updateClock();
};

/**
 * Gets data from the json file and updates it in store
 */
const initializeConfig = async () => {
  const config = getConfig();
  store.commit(SET_CONFIG, {
    config,
  });
};

const updateEngineUnit = async (timeout: number) => {
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

const updateThermalUnit = async (timeout: number) => {
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

const updateWatchdogEngine = async (timeout: number) => {
  const ip = store.state.config.units.engine.ip;
  const postfix = store.state.config.units.postfixWatchdog;
  await getData(timeout, ip, postfix, false);
};

/**
 * Gets data from babybox and updates @data and @time in store
 */
const initializeData = () => {
  const delay = store.state.config.units.requestDelay || 2000;
  const timeout = store.state.config.units.requestTimeout || 5000;
  setInterval(() => {
    updateEngineUnit(timeout);
    updateThermalUnit(timeout);
    updateState();
    updateWatchdogEngine(timeout);
  }, delay);
};

/**
 * Gets the time from engine unit and stores it in store
 */
const updateClock = () => {
  const time = convertSDSTimeToMoment(store.state.engineUnit);
  store.commit(SET_TIME, {
    time,
  });
};

/**
 * Initilizes the whole store
 */
export const initializeStore = async () => {
  initializeConfig();
  initializeData();
};
