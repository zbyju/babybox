<template>
  <div id="BigClock">
    <span id="BigClockHours">{{ hours }}</span>
    <span id="BigClockColon" v-show="showColon">:</span>
    <span id="BigClockMinutes">{{ minutes }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from "vue";
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
  font-size 30vw
</style>
