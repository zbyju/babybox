<template>
  <div id="Time">
    <span id="Time">{{ fullTime }}</span>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import { useUnitsStore } from "@/pinia/unitsStore";
  import { getFullTime } from "@/utils/time";

  const unitsStore = useUnitsStore();
  const { time } = storeToRefs(unitsStore);
  const fullTime = computed((): string => getFullTime(time.value));
</script>

<style lang="stylus">
  #Time
    grid-area time
    font-weight 600
    font-size font-size-smallClock vw
</style>
