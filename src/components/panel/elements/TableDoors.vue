<template>
  <div id="TableDoors">
    <DataTable :title="title" :rows="rows" :blocks="blocks" :values="values" />
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import { getTableDoorsValues } from "@/logic/panel/tables";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
  } from "@/types/panel/tables.types";

  import DataTable from "../table/DataTable.vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const values = computed(() =>
    getTableDoorsValues(engineUnit.value, thermalUnit.value),
  );
  const blocks: TableBlockTemplate[] = [
    {
      field: "isBlocked",
      activeLabel: "Blokováno",
      inactiveLabel: "Neblokováno",
      colspan: 6,
    },
  ];
  const rows: TableRowTemplate[] = [
    {
      field: "leftPosition",
      label: "Levé poloha",
    },
    {
      field: "rightPosition",
      label: "Pravé poloha",
    },
    {
      field: "leftLoad",
      label: "Levé zátěž",
    },
    {
      field: "rightLoad",
      label: "Pravé zátěž",
    },
    {
      field: "beamAboveContainer",
      label: "Paprsek nad vaničkou",
    },
  ];
  const title = "Přední dvířka";
</script>

<style lang="stylus">
  #TableDoors
    grid-area table-doors
</style>
