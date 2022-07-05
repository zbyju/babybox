<template>
    <div id="Date">
        <span id="Date">{{ date }}</span>
    </div>
</template>

<script lang="ts" setup>
import { useUnitsStore } from "@/pinia/unitsStore";
import { getFullDate } from "@/utils/time";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const unitsStore = useUnitsStore();
const { time } = storeToRefs(unitsStore);
const date = computed((): string => getFullDate(time.value)); // TODO: Change to computed without time
</script>

<style lang="stylus">
#Date
  white-space nowrap
  font-size 1.7vw
  font-weight 600
  color: text-secondary
</style>
