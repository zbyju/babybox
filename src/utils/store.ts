import { SET_CONFIG } from "@/store/mutation-types/index-types";
import { Config } from "@/types/main";
import { useStore } from "vuex";

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
const initializeClock = () => {};

/**
 * Initilizes the whole store
 */
export const initializeStore = async () => {
  initializeConfig();
  initializeData();
  initializeClock();
};
