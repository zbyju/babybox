<template>
  <div id="Time">
    <span id="Time" :style="textSize">{{ time }}</span>
    <button @click="toggleMessage"></button>
    <button @click="toggleActive"></button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { getFullTime } from "@/utils/time";
import { SET_STATE, RESET_STATE } from "@/store/mutation-types/index-types";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): string => getFullTime(store.state.time));
    const textSize = {
      fontSize: store.state.config.fontSizes.smallClock + "vw",
    };

    // TODO: Remove toggleMessage
    const toggleMessage = () => {
      const appState = store.state.appState;
      if (appState && appState.message) store.commit(RESET_STATE);
      else
        store.commit(SET_STATE, {
          state: {
            message: {
              text: "Babybox mimo provoz",
              color: "text-warning",
            },
            active: false,
          },
        });
    };

    // TODO: Remove toggleActive
    const toggleActive = () => {
      const appState = store.state.appState;
      if (appState?.active) store.commit(RESET_STATE);
      else
        store.commit(SET_STATE, {
          state: {
            message: {
              text: "Babybox aktivní!",
              color: "text-active",
              sound: "Aktivace",
            },
            active: true,
          },
        });
    };
    return { time, textSize, toggleMessage, toggleActive };
  },
});
</script>

<style lang="stylus">
#Time
  grid-area time
  font-weight 600
  font-size 1.7vw
</style>
