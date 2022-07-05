<template>
  <div id="TableTemperature">
    <div class="Table">
      <BaseTable :title="title" :rows="rows" :blocks="blocks" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import {
    getBlocksTableTemperature,
    getRowsTableTemperatures,
  } from "@/utils/panel/tables";
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  const unitsStore = useUnitsStore();
  const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
  const rows = computed(() => {
    return getRowsTableTemperatures(engineUnit.value, thermalUnit.value);
  });
  const blocks = computed(() => {
    return getBlocksTableTemperature(engineUnit.value, thermalUnit.value);
  });
  const title = "Topení/chlazení";
</script>

<style lang="stylus"></style>
