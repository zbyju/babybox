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
import {
  REMOVE_MESSAGE,
  SET_MESSAGE,
  BABYBOX_ACTIVE,
  BABYBOX_NON_ACTIVE,
} from "@/store/mutation-types/index-types";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): string => getFullTime(store.state.timePC));
    const textSize = {
      fontSize: store.state.config.fontSizes.smallClock + "vw",
    };

    // TODO: Remove toggleMessage
    const toggleMessage = () => {
      const message = store.state.message;
      if (message) store.commit(REMOVE_MESSAGE);
      else
        store.commit(SET_MESSAGE, {
          message: {
            text: "Babybox mimo provoz",
            color: "text-success",
          },
        });
    };

    // TODO: Remove toggleActive
    const toggleActive = () => {
      if (store.state.active) store.commit(BABYBOX_NON_ACTIVE);
      else store.commit(BABYBOX_ACTIVE);
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
