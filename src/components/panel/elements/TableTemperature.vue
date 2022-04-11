<template>
  <div id="TableTemperature">
    <div class="Table">
      <Table :titleProp="title" :rowsProp="rows" :blocksProp="blocks"></Table>
    </div>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import {
  getBlocksTableTemperature,
  getRowsTableTemperatures,
} from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  components: { Table },
  setup() {
    const unitsStore = useUnitsStore();
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const rows = computed(() => {
      return getRowsTableTemperatures(engineUnit.value, thermalUnit.value);
    });
    const blocks = computed(() => {
      return getBlocksTableTemperature(engineUnit.value, thermalUnit.value);
    });
    return {
      title: "Topení/chlazení",
      rows,
      blocks,
    };
  },
});
</script>

<style lang="stylus"></style>
