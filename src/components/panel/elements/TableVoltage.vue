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

  const values = getTableVoltageValues(engineUnit.value, thermalUnit.value);
  const blocks: TableBlockTemplate[] = [];
  const rows: TableRowTemplate[] = [
    {
      field: "optimalTemperature",
      label: "Zdroj",
    },
    {
      field: "innerTemperature",
      label: "Akumulátor",
    },
    {
      field: "outsideTemperature",
      label: "Řídící jednotky",
    },
    {
      field: "bottomTemperature",
      label: "GSM komunikátor",
    },
    {
      field: "topTemperature",
      label: "Zdroj cíl",
    },
    {
      field: "casingTemperature",
      label: "Akumulátor cíl",
    },
    {
      field: "casingTemperature",
      label: "Řídící jednotky cíl",
    },
  ];
  const title = "Napětí";
</script>

<style lang="stylus">
  #TableVoltage
    grid-area table-voltage
</style>
