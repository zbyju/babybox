import store from "@/store";
import {
  SET_CONFIG,
  SET_ENGINE_UNIT,
  SET_THERMAL_UNIT,
  SET_TIME_PC,
} from "@/store/mutation-types/index-types";
import { Config } from "@/types/main";
import { useStore } from "vuex";
import { getCurrentTimePC } from "./time";
import { getEngineData, getThermalData } from "@/api/units";

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

const initEngineUnit = async () => {
  try {
    const data = await getEngineData();
    store.commit(SET_ENGINE_UNIT, {
      data,
    });
  } catch (err) {
    console.log(err);
  }
};

const initThermalUnit = async () => {
  try {
    const data = await getThermalData();
    store.commit(SET_THERMAL_UNIT, {
      data,
    });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Gets data from babybox and updates @data and @time in store
 */
const initializeData = (delay: number) => {
  setInterval(() => {
    initEngineUnit();
    initThermalUnit();
  }, delay);
};

/**
 * Gets the current computer time and initilizes it
 * @param {number} delay - How frequently should the time update
 */
const initializeClock = (delay: number) => {
  const store = useStore();
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
  initializeData(2000);
  initializeClock(500);
};
