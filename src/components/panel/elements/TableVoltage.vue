<template>
  <div id="TableVoltage">
    <DataTable :title="title" :rows="rows" :blocks="blocks" :values="values" />
  </div>
</template>

<script lang="ts" setup>
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
  } from "@/types/panel/tables.types";
  import { getTableVoltageValues } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";
  import DataTable from "../table/DataTable.vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);

  const values = computed(() =>
    getTableVoltageValues(engineUnit.value, thermalUnit.value),
  );
  const blocks: TableBlockTemplate[] = [];
  const rows: TableRowTemplate[] = [
    {
      field: "inVoltage",
      label: "Zdroj",
    },
    {
      field: "batteryVoltage",
      label: "Akumulátor",
    },
    {
      field: "unitsVoltage",
      label: "Řídící jednotky",
    },
    {
      field: "gsmVoltage",
      label: "GSM komunikátor",
    },
    {
      field: "inGoalVoltage",
      label: "Zdroj cíl",
    },
    {
      field: "batteryGoalVoltage",
      label: "Akumulátor cíl",
    },
    {
      field: "unitsGoalVoltage",
      label: "Řídící jednotky cíl",
    },
  ];
  const title = "Napětí";
</script>

<style lang="stylus">
  #TableVoltage
    grid-area table-voltage
</style>
