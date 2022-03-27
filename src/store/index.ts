import { getDefaultAppState } from "@/defaults/appState";
import {
  ConnectionResult,
  getDefaultConnection,
} from "@/types/panel/connection";
import { State } from "@/types/panel/main";
import {
  DefaultEngineUnit,
  DefaultThermalUnit,
} from "@/types/panel/units-data";
import { createStore } from "vuex";
import {
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  RESET_STATE,
  SET_CONFIG,
  SET_ENGINE_UNIT,
  SET_STATE,
  SET_THERMAL_UNIT,
  SET_TIME,
} from "./mutation-types/index-types";

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
