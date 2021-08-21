<template>
  <div id="TableVoltage">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { getRowsVoltage } from "@/utils/panel/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsVoltage(store.state.engineUnit, store.state.thermalUnit);
    });
    return {
      title: "Napětí",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableVoltage
  grid-area table-voltage
</style>
