<template>
  <div id="Date">
    <span id="Date" :style="textSize">{{ date }}</span>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getFullDate } from "@/utils/time";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  setup() {
    const unitsStore = useUnitsStore();
    const configStore = useConfigStore();
    const { time } = storeToRefs(unitsStore);
    const { fontSize } = storeToRefs(configStore);
    const date = computed((): string => getFullDate(time.value)); // TODO: Change to computed without time
    const textSize = {
      fontSize: fontSize.value.smallClock + "vw",
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
