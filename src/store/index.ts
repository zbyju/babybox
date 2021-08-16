import { createStore } from "vuex";

import { State } from "@/types/main";
import {
  SET_CONFIG,
  SET_STATE,
  RESET_STATE,
  SET_ENGINE_UNIT,
  SET_THERMAL_UNIT,
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
  SET_TIME,
} from "./mutation-types/index-types";
import { DefaultEngineUnit, DefaultThermalUnit } from "@/types/units-data";
import { getDefaultAppState } from "@/defaults/appState";
import { ConnectionResult, getDefaultConnection } from "@/types/connection";

export default createStore<State>({
  state: {
    config: null,
    time: null,
    data: null,
    appState: getDefaultAppState(),
    thermalUnit: DefaultThermalUnit,
    engineUnit: DefaultEngineUnit,
    connection: getDefaultConnection(),
  },
  mutations: {
    [SET_CONFIG](state, payload) {
      state.config = payload.config;
    },
    [SET_TIME](state, payload) {
      state.time = payload.time;
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
      state.connection.engineUnit.addResult(ConnectionResult.Success);
    },
    [INCREMENT_SUCCESS_THERMAL](state) {
      state.connection.thermalUnit.addResult(ConnectionResult.Success);
    },
    [INCREMENT_FAIL_ENGINE](state) {
      state.connection.engineUnit.addResult(ConnectionResult.Fail);
    },
    [INCREMENT_FAIL_THERMAL](state) {
      state.connection.thermalUnit.addResult(ConnectionResult.Fail);
    },
  },
  actions: {},
  modules: {},
});
