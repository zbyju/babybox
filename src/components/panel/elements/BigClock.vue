<template>
  <div id="BigClock">
    <span id="BigClockHours">{{ hours }}</span>
    <span id="BigClockColon">:</span>
    <span id="BigClockMinutes">{{ minutes }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import moment from "moment";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): moment.Moment => store.state.timePC);
    const hours = computed((): string =>
      time.value ? time.value.hours.toString() : "--"
    );
    const minutes = computed((): string =>
      time.value ? time.value.minutes.toString() : "--"
    );
    return { hours, minutes };
  },
});
</script>

<style lang="stylus">
#BigClock
  font-weight 900
  font-size 30vw
</style>
