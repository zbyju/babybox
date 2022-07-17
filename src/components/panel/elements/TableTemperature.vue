<template>
  <div id="TableTemperature">
    <div class="Table">
      <DataTable
        :title="title"
        :rows="rows"
        :blocks="blocks"
        :values="values"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
  } from "@/types/panel/tables.types";
  import { getTableTemperaturesValues } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";
  import DataTable from "../table/DataTable.vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);

  const values = getTableTemperaturesValues(
    engineUnit.value,
    thermalUnit.value,
  );
  const blocks: TableBlockTemplate[] = [
    {
      field: "isHeatingCasing",
      activeLabel: "Topí plášť",
      inactiveLabel: "Netopí plášť",
      colspan: 2,
    },
    {
      field: "isHeatingAir",
      activeLabel: "Topí vzduch",
      inactiveLabel: "Netopí vzduch",
      colspan: 2,
    },
    {
      field: "isCoolingAir",
      activeLabel: "Chladí vzduch",
      inactiveLabel: "Nechladí vzduch",
      colspan: 2,
    },
  ];
  const rows: TableRowTemplate[] = [
    {
      field: "optimalTemperature",
      label: "Cílová teplota",
    },
    {
      field: "innerTemperature",
      label: "Vnitřní teplota",
    },
    {
      field: "outsideTemperature",
      label: "Venkovní teplota",
    },
    {
      field: "bottomTemperature",
      label: "Vnitřní výměník vzduch",
    },
    {
      field: "topTemperature",
      label: "Venkovní výměník vzduch",
    },
    {
      field: "casingTemperature",
      label: "Vnitřní plášť",
    },
  ];
  const title = "Topení/chlazení";
</script>

<style lang="stylus"></style>
