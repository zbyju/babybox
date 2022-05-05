<template>
  <div id="Date">
    <span id="Date">{{ date }}</span>
  </div>
</template>

<script lang="ts">
import { useUnitsStore } from "@/pinia/unitsStore";
import { getFullDate } from "@/utils/time";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  setup() {
    const unitsStore = useUnitsStore();
    const { time } = storeToRefs(unitsStore);
    const date = computed((): string => getFullDate(time.value)); // TODO: Change to computed without time
    return { date };
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
