<template>
  <div id="BigClock">
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
    return { hours, minutes, showColon };
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

  span
    margin-top -2.5vw
    font-size 21vw
    line-height 1em

.transparent
  color transparent
</style>
