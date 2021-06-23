import store from "@/store";
import { SET_CONFIG, SET_TIME_PC } from "@/store/mutation-types/index-types";
import { Config } from "@/types/main";
import { useStore } from "vuex";
import { getCurrentTimePC } from "./time";

/**
 * Fetches data from babybox
 */
const getData = async () => {};

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

/**
 * Gets data from babybox and updates @data and @time in store
 */
const initializeData = () => {
  getData();
};

/**
 * Gets the current computer time and initilizes it
 */
const initializeClock = () => {
  const store = useStore();
  setInterval(() => {
    const time = getCurrentTimePC();
    store.commit(SET_TIME_PC, {
      time,
    });
  }, 1000);
};

/**
 * Initilizes the whole store
 */
export const initializeStore = async () => {
  initializeConfig();
  initializeData();
  initializeClock();
};
