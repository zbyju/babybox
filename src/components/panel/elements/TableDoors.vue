<template>
  <div id="TableDoors">
    <BaseTable :title="title" :rows="rows" :blocks="blocks" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import { getBlocksTableDoors, getRowsTableDoors } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const rows = computed(() => {
    return getRowsTableDoors(engineUnit.value, thermalUnit.value);
  });
  const blocks = computed(() => {
    return getBlocksTableDoors(engineUnit.value, thermalUnit.value);
  });
  const title = "Přední dvířka";
</script>

<style lang="stylus">
  #TableDoors
    grid-area table-doors
</style>
