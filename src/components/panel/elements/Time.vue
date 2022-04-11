<template>
  <div id="Time">
    <span id="Time" :style="textSize">{{ fullTime }}</span>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getFullTime } from "@/utils/time";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  setup() {
    const unitsStore = useUnitsStore();
    const configStore = useConfigStore();
    const { time } = storeToRefs(unitsStore);
    const { fontSize } = storeToRefs(configStore);
    const fullTime = computed((): string => getFullTime(time.value));
    const textSize = {
      fontSize: fontSize.value.smallClock + "vw",
    };
    return { fullTime, textSize };
  },
});
</script>

<style lang="stylus">
#Time
  grid-area time
  font-weight 600
  font-size 1.7vw
</style>
