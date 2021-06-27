import { createStore } from "vuex";

import { State } from "@/types/main";
import {
  SET_CONFIG,
  SET_TIME_PC,
  SET_MESSAGE,
  REMOVE_MESSAGE,
  BABYBOX_ACTIVE,
  BABYBOX_NON_ACTIVE,
} from "./mutation-types/index-types";

export default createStore<State>({
  state: {
    config: null,
    time: null,
    timePC: null,
    data: null,
    message: null,
    active: false,
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
