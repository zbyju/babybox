<template>
  <div id="TableConnection">
    <BaseTable :title="title" :rows="rows" />
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useConnectionStore } from "@/pinia/connectionStore";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import type {
    RowData,
    TableConnectionValues,
    TableData,
  } from "@/types/panel/tables.types";
  import { getRowsTableConnection } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const connectionStore = useConnectionStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  // TODO: Check to refactor
  const { engineUnit: eu, thermalUnit: tu } = storeToRefs(connectionStore);
  const values: TableConnectionValues = undefined;
  const rows: TableData = computed(() => [{
    label: ,
    value: ,
    error: ,
    success: ,
    warning: ,
  }]);
  const title = "Spojení PC ↔ BB";
</script>

<style lang="stylus">
  #TableConnection
    grid-area table-connection
</style>
