<template>
  <div id="Date">
    <span id="Date">{{ date }}</span>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import { useUnitsStore } from "@/pinia/unitsStore";
  import { getFullDate } from "@/utils/time";

  const unitsStore = useUnitsStore();
  const { time } = storeToRefs(unitsStore);
  const date = computed((): string => getFullDate(time.value));
</script>

<style lang="stylus">
  #Date
    white-space nowrap
    font-size 1.7vw
    font-weight 600
    color: text-secondary
</style>
