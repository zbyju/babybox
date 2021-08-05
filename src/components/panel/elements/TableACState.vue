<template>
  <div id="TableACState">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsACState } from "@/utils/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsACState(store.state.engineUnit, store.state.thermalUnit);
    });
    return {
      title: "Stav Klimatizace",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableACState
  grid-area table-ac

  flex-grow 10
</style>
