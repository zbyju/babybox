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
  INCREMENT_SUCCESS_ENGINE,
  INCREMENT_SUCCESS_THERMAL,
  INCREMENT_FAIL_ENGINE,
  INCREMENT_FAIL_THERMAL,
} from "./mutation-types/index-types";
import { DefaultEngineUnit, DefaultThermalUnit } from "@/types/units-data";
import { DefaultConnection } from "@/types/connection";

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
