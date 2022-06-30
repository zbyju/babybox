<template>
  <div id="Time">
    <span id="Time">{{ fullTime }}</span>
  </div>
</template>

<script lang="ts">
import { useUnitsStore } from "@/pinia/unitsStore";
import { getFullTime } from "@/utils/time";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  setup() {
    const unitsStore = useUnitsStore();
    const { time } = storeToRefs(unitsStore);
    const fullTime = computed((): string => getFullTime(time.value));
    return { fullTime };
  },
});
</script>

<style lang="stylus">
#Time
  grid-area time
  font-weight 600
  font-size font-size-smallClock vw
</style>
