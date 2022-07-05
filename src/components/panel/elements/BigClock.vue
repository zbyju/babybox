<template>
  <div id="BigClock" :class="{ bigger: bigger }">
    <span id="BigClockHours">{{ hours }}</span>
    <span id="BigClockColon" :class="{ transparent: !showColon }">:</span>
    <span id="BigClockMinutes">{{ minutes }}</span>
  </div>
</template>

<script lang="ts" setup>
  import useActiveTime from "@/composables/useActiveTime";
  import useBigClockColon from "@/composables/useBigClockColon";
  import { useAppStateStore } from "@/pinia/appStateStore";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import {
    getHoursWithLeadingZeroes,
    getMinutesWithLeadingZeroes,
  } from "@/utils/time";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const appStateStore = useAppStateStore();
  const { time: storeTime } = storeToRefs(unitsStore);
  const { message, active } = storeToRefs(appStateStore);
  const time = useActiveTime(storeTime, active);
  const { showColon } = useBigClockColon(time, active);
  const hours = computed((): string => getHoursWithLeadingZeroes(time.value));
  const minutes = computed((): string =>
    getMinutesWithLeadingZeroes(time.value),
  );
  const bigger = computed((): boolean => {
    return !message.value?.text;
  });
</script>

<style lang="stylus">

  #BigClock
    font-size font-size-bigClockSmaller vw
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
    font-size font-size-bigClockBigger vw

  .transparent
    color transparent
</style>
