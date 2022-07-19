<template>
  <div id="TableConnection">
    <DataTable :title="title" :rows="rows" :blocks="blocks" :values="values" />
  </div>
</template>

<script lang="ts" setup>
  import { useConfigStore } from "@/pinia/configStore";
  import { useConnectionStore } from "@/pinia/connectionStore";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type { Maybe } from "@/types/generic.types";
  import type {
    TableBlockTemplate,
    TableRowTemplate,
    TableConnectionValues,
  } from "@/types/panel/tables.types";
  import { getTableConnectionValues } from "@/logic/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed, type ComputedRef } from "vue";
  import DataTable from "../table/DataTable.vue";

  const unitsStore = useUnitsStore();
  const connectionStore = useConnectionStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const { connection } = storeToRefs(connectionStore);
  const configStore = useConfigStore();
  const { units } = storeToRefs(configStore);

  const values: ComputedRef<TableConnectionValues> = computed(() =>
    getTableConnectionValues(
      engineUnit.value,
      thermalUnit.value,
      connection.value,
      units,
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
