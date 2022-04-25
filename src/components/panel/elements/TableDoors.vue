<template>
  <div id="TableDoors">
    <Table :titleProp="title" :rowsProp="rows" :blocksProp="blocks"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getBlocksTableDoors, getRowsTableDoors } from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  components: { Table },
  setup() {
    const unitsStore = useUnitsStore();
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const rows = computed(() => {
      return getRowsTableDoors(engineUnit.value, thermalUnit.value);
    });
    const blocks = computed(() => {
      return getBlocksTableDoors(engineUnit.value, thermalUnit.value);
    });
    return {
      title: "Přední dvířka",
      rows,
      blocks,
    };
  },
});
</script>

<style lang="stylus">
#TableDoors
  grid-area table-doors
</style>
