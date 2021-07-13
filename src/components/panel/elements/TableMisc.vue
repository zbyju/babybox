<template>
  <div id="TableMisc">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsTableMisc } from "@/utils/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsTableMisc(store.state.engineUnit, store.state.thermalUnit);
    });
    return {
      title: "Tabulka ostatni",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableMisc
  grid-area table-misc

  flex-grow 10
  align-self flex-end
</style>
