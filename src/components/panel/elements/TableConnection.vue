<template>
  <div id="TableConnection">
    <BaseTable :title="title" :rows="rows" :blocks="blocks" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useConnectionStore } from "@/pinia/connectionStore";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type { Maybe } from "@/types/generic.types";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
    TableConnectionValues,
  } from "@/types/panel/tables.types";
  import { storeToRefs } from "pinia";
  import { computed, type ComputedRef } from "vue";

  const unitsStore = useUnitsStore();
  const connectionStore = useConnectionStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  // TODO: Check to refactor
  const { engineUnit: eu, thermalUnit: tu } = storeToRefs(connectionStore);
  const values: Maybe<TableConnectionValues> = undefined;
  const blocks: TableBlockTemplate[] = [];
  const rows: TableRowTemplate[] = [
    {
      field: "optimalTemperature",
      label: "PC dotaz",
    },
    {
      field: "innerTemperature",
      label: "BB odpověď",
    },
    {
      field: "outsideTemperature",
      label: "Ztracené odpovědi",
    },
    {
      field: "bottomTemperature",
      label: "Kvalita spojení",
    },
    {
      field: "topTemperature",
      label: "Limit spojení",
    },
    {
      field: "casingTemperature",
      label: "Čas do zkoušky",
    },
  ];
  const title = "Spojení PC ↔ BB";
</script>

<style lang="stylus">
  #TableConnection
    grid-area table-connection
</style>
