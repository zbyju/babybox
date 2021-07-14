import { createStore } from "vuex";

import { State } from "@/types/main";
import {
  SET_CONFIG,
  SET_TIME_PC,
  SET_MESSAGE,
  SET_ENGINE_UNIT,
  SET_THERMAL_UNIT,
  REMOVE_MESSAGE,
  BABYBOX_ACTIVE,
  BABYBOX_NON_ACTIVE,
} from "./mutation-types/index-types";
import { DefaultEngineUnit, DefaultThermalUnit } from "@/types/units-data";

export default createStore<State>({
  state: {
    config: null,
    time: null,
    timePC: null,
    data: null,
    message: null, // TODO: Change to a state
    active: false, // TODO: Change to a state
    thermalUnit: DefaultThermalUnit,
    engineUnit: DefaultEngineUnit,
  },
  mutations: {
    [SET_CONFIG](state, payload) {
      state.config = payload.config;
    },
    [SET_TIME_PC](state, payload) {
      state.timePC = payload.time;
    },
    [SET_TIME_PC](state, payload) {
      state.timePC = payload.time;
    },
    [SET_MESSAGE](state, payload) {
      state.message = payload.message;
    },
    [SET_ENGINE_UNIT](state, payload) {
      state.engineUnit = payload.data;
    },
    [SET_THERMAL_UNIT](state, payload) {
      state.thermalUnit = payload.data;
    },
    [REMOVE_MESSAGE](state) {
      state.message = null;
    },
    [BABYBOX_ACTIVE](state) {
      state.active = true;
    },
    [BABYBOX_NON_ACTIVE](state) {
      state.active = false;
    },
  },
  actions: {},
  modules: {},
});
