<template>
  <div id="Time">
    <span id="Time">{{ time }}</span>
    <button @click="toggleMessage"></button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { getFullTime } from "@/utils/time";
import {
  REMOVE_MESSAGE,
  SET_MESSAGE,
} from "@/store/mutation-types/index-types";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): string => getFullTime(store.state.timePC));
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
      console.log(message);
    };
    return { time, toggleMessage };
  },
});
</script>

<style lang="stylus">
#Time
  grid-area time
  font-weight 600
  font-size 1.7vw
</style>
