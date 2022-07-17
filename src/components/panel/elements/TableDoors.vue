<template>
  <div id="TableDoors">
    <BaseTable :title="title" :rows="rows" :blocks="blocks" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
  } from "@/types/panel/tables.types";
  import { getBlocksTableDoors, getRowsTableDoors } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const blocks: TableBlockTemplate[] = [
    {
      field: "isHeatingCasing",
      activeLabel: "Blokováno",
      inactiveLabel: "Neblokováno",
      colspan: 6,
    },
  ];
  const rows: TableRowTemplate[] = [
    {
      field: "optimalTemperature",
      label: "Levé poloha",
    },
    {
      field: "innerTemperature",
      label: "Pravé poloha",
    },
    {
      field: "outsideTemperature",
      label: "Levé zátěž",
    },
    {
      field: "bottomTemperature",
      label: "Pravé zátěž",
    },
    {
      field: "topTemperature",
      label: "Paprsek nad vaničkou",
    },
  ];
  const title = "Přední dvířka";
</script>

<style lang="stylus">
  #TableDoors
    grid-area table-doors
</style>
