<template>
  <div id="TableTemperature">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsTableTemperatures } from "@/utils/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsTableTemperatures(
        store.state.engineUnit,
        store.state.thermalUnit
      );
    });
    return {
      title: "Teploty",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableTemperature
  grid-area table-temperature

  flex-grow 10
  align-self flex-end
</style>
