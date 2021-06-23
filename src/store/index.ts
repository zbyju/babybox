import { createStore } from "vuex";

import { State } from "@/types/main";
import { SET_CONFIG } from "./mutation-types/index-types";

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
  },
  actions: {},
  modules: {},
});
