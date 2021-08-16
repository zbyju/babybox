<template>
  <div id="BigClock" :class="{ bigger: bigger }" :style="textSize">
    <span id="BigClockHours" :style="textSize">{{ hours }}</span>
    <span
      id="BigClockColon"
      :style="textSize"
      :class="{ transparent: showColon }"
      >:</span
    >
    <span id="BigClockMinutes" :style="textSize">{{ minutes }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import useBigClockColon from "@/composables/useBigClockColon";
import moment from "moment";
import {
  getHoursWithLeadingZeroes,
  getMinutesWithLeadingZeroes,
} from "@/utils/time";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): moment.Moment => store.state.time);
    const { showColon } = useBigClockColon(time);
    const hours = computed((): string => getHoursWithLeadingZeroes(time.value));
    const minutes = computed((): string =>
      getMinutesWithLeadingZeroes(time.value)
    );
    const bigger = computed((): boolean => {
      return !store.state.appState.message?.text;
    });
    const textSize = computed(() => {
      return bigger.value
        ? {
            fontSize: store.state.config.fontSizes.bigClockBigger + "vw",
          }
        : {
            fontSize: store.state.config.fontSizes.bigClockSmaller + "vw",
          };
    });
    return { hours, minutes, showColon, bigger, textSize };
  },
});
</script>

<style lang="stylus">

#BigClock
  font-weight 900

  display flex
  flex-direction row
  flex-wrap nowrap
  justify-content center

  width fit-content
  height 100%

  white-space nowrap

  animation-duration 1s
  animation-fill-mode both

  span
    margin-top -2.5vw
    line-height 0.95em
    transition all 1s ease-in-out

#BigClock.bigger
  animation-duration 1s
  animation-fill-mode both
  animation-delay 1s

.transparent
  color transparent
</style>
