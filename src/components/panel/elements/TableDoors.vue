<template>
  <div id="TableDoors">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsTableDoors } from "@/utils/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsTableDoors(store.state.engineUnit, store.state.thermalUnit);
    });
    return {
      title: "Přední dvířka",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableDoors
  grid-area table-doors
</style>
