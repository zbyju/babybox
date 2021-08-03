import { createStore } from "vuex";

import { State } from "@/types/main";
import {
  SET_CONFIG,
  SET_TIME_PC,
  SET_STATE,
  RESET_STATE,
  SET_ENGINE_UNIT,
  SET_THERMAL_UNIT,
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
} from "./mutation-types/index-types";
import { DefaultEngineUnit, DefaultThermalUnit } from "@/types/units-data";
import { DefaultConnection } from "@/types/connection";
import { getDefaultAppState } from "@/defaults/appState";

export default createStore<State>({
  state: {
    config: null,
    time: null,
    timePC: null,
    data: null,
    appState: getDefaultAppState(),
    thermalUnit: DefaultThermalUnit,
    engineUnit: DefaultEngineUnit,
    connection: DefaultConnection,
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

    [SET_STATE](state, payload) {
      state.appState = payload.state;
    },
    [RESET_STATE](state) {
      state.appState = getDefaultAppState();
    },

    [SET_ENGINE_UNIT](state, payload) {
      state.engineUnit = payload.data;
    },
    [SET_THERMAL_UNIT](state, payload) {
      state.thermalUnit = payload.data;
    },

    [INCREMENT_SUCCESS_ENGINE](state) {
      state.connection.engineUnit.requests += 1;
      state.connection.engineUnit.successful += 1;
    },
    [INCREMENT_SUCCESS_THERMAL](state) {
      state.connection.thermalUnit.requests += 1;
      state.connection.thermalUnit.successful += 1;
    },
    [INCREMENT_FAIL_ENGINE](state) {
      state.connection.engineUnit.requests += 1;
      state.connection.engineUnit.failed += 1;
    },
    [INCREMENT_FAIL_THERMAL](state) {
      state.connection.thermalUnit.requests += 1;
      state.connection.thermalUnit.failed += 1;
    },
  },
  actions: {},
  modules: {},
});
