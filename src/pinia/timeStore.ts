import moment from "moment";
import { defineStore } from "pinia";

export const useStore = defineStore("time", {
  state: () => ({
    time: null as moment.Moment,
  }),
  actions: {},
});
