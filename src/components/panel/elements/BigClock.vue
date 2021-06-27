<template>
  <div id="BigClock" :class="{ bigger: bigger }">
    <span id="BigClockHours">{{ hours }}</span>
    <span id="BigClockColon" :class="{ transparent: showColon }">:</span>
    <span id="BigClockMinutes">{{ minutes }}</span>
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
    const time = computed((): moment.Moment => store.state.timePC);
    const { showColon } = useBigClockColon(time);
    const hours = computed(() => getHoursWithLeadingZeroes(time.value));
    const minutes = computed(() => getMinutesWithLeadingZeroes(time.value));
    const bigger = computed(() => {
      return !store.state.message;
    });
    return { hours, minutes, showColon, bigger };
  },
});
</script>

<style lang="stylus">
normal-font = 21vw
big-font = 26vw

#BigClock
  font-weight 900

  display flex
  flex-direction row
  flex-wrap nowrap
  justify-content center

  width fit-content
  height 100%

  white-space nowrap

  font-size normal-font

  animation-name makeNormal
  animation-duration 1s
  animation-fill-mode both

  span
    margin-top -2.5vw
    font-size inherit
    line-height 0.95em
    transition all 1s ease-in-out

#BigClock.bigger
  animation-name makeBigger
  animation-duration 1s
  animation-fill-mode both
  animation-delay 1s

.transparent
  color transparent

@keyframes makeBigger {
  from {
    font-size normal-font
  }
  to {
    font-size big-font
  }
}
@keyframes makeNormal {
  from {
    font-size big-font
  }
  to {
    font-size normal-font
  }
}
</style>
