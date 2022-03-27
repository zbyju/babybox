<template>
  <div id="Date">
    <span id="Date" :style="textSize">{{ date }}</span>
  </div>
</template>

<script lang="ts">
import { getFullDate } from "@/utils/time";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  setup() {
    const store = useStore();
    const date = computed((): string => getFullDate(store.state.time));
    const textSize = {
      fontSize: store.state.config.fontSizes.smallClock + "vw",
    };
    return { date, textSize };
  },
});
</script>

<style lang="stylus">
#Date
  white-space nowrap
  font-size 1.7vw
  font-weight 600
  color: text-secondary
</style>
