<template>
  <div id="TableVoltage">
    <BaseTable :title="title" :rows="rows" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import { getRowsVoltage } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const rows = computed(() => {
    return getRowsVoltage(engineUnit.value, thermalUnit.value);
  });
  const title = "Napětí";
</script>

<style lang="stylus">
  #TableVoltage
    grid-area table-voltage
</style>
