<template>
  <div id="TableConnection">
    <DataTable :title="title" :rows="rows" :blocks="blocks" :values="values" />
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { type ComputedRef, computed } from "vue";

  import { getTableConnectionValues } from "@/logic/panel/tables";
  import { useConfigStore } from "@/pinia/configStore";
  import { useConnectionStore } from "@/pinia/connectionStore";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    TableBlockTemplate,
    TableConnectionValues,
    TableRowTemplate,
  } from "@/types/panel/tables.types";

  import DataTable from "../table/DataTable.vue";

  const unitsStore = useUnitsStore();
  const connectionStore = useConnectionStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const { connection } = storeToRefs(connectionStore);
  const configStore = useConfigStore();
  const { config } = storeToRefs(configStore);

  const values: ComputedRef<TableConnectionValues> = computed(() =>
    getTableConnectionValues(
      engineUnit.value,
      thermalUnit.value,
      connection.value,
      config.value,
    ),
  );
  const blocks: TableBlockTemplate[] = [];
  const rows: TableRowTemplate[] = [
    {
      field: "requests",
      label: "PC dotaz",
    },
    {
      field: "successfulRequests",
      label: "BB odpověď",
    },
    {
      field: "failedRequests",
      label: "Ztracené odpovědi",
    },
    {
      field: "quality",
      label: "Kvalita spojení",
    },
    {
      field: "timeout",
      label: "Limit spojení",
    },
    {
      field: "timeToInspection",
      label: "Čas do zkoušky",
    },
  ];
  const title = "Spojení PC ↔ BB";
</script>

<style lang="stylus">
  #TableConnection
    grid-area table-connection
</style>
