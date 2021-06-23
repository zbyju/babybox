import { createStore } from "vuex";

import { State } from "@/types/main";
import { SET_CONFIG, SET_TIME_PC } from "./mutation-types/index-types";

export default createStore<State>({
  state: {
    config: null,
    time: null,
    timePC: null,
    data: null,
  },
  mutations: {
    [SET_CONFIG](state, payload) {
      state.config = payload.config;
    },
    [SET_TIME_PC](state, payload) {
      state.timePC = payload.time;
    },
  },
  actions: {},
  modules: {},
});
