<template>
  <div id="Date">
    <span id="Date" :style="textSize">{{ date }}</span>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const unitsStore = useUnitsStore();
    const configStore = useConfigStore();
    const { fontSize } = storeToRefs(configStore);
    const textSize = {
      fontSize: fontSize.value.smallClock + "vw",
    };

    // TODO: This might be wrong, check
    return { date: unitsStore.fullDate, textSize };
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
