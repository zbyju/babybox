<template>
  <div id="TableConnection">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsTableConnection } from "@/utils/panel/tables";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsTableConnection(
        store.state.engineUnit,
        store.state.thermalUnit,
        store.state.connection
      );
    });
    return {
      title: "Spojení PC ↔ BB",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableConnection
  grid-area table-connection
</style>
