<template>
  <div id="TableVoltage">
    <BaseTable :title="title" :rows="rows" :blocks="blocks" :values="values" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
  } from "@/types/panel/tables.types";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);

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
