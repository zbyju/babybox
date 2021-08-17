<template>
  <div id="Time">
    <span id="Time" :style="textSize">{{ time }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { getFullTime } from "@/utils/time";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): string => getFullTime(store.state.time));
    const textSize = {
      fontSize: store.state.config.fontSizes.smallClock + "vw",
    };
    return { time, textSize };
  },
});
</script>

<style lang="stylus">
#Time
  grid-area time
  font-weight 600
  font-size 1.7vw
</style>
