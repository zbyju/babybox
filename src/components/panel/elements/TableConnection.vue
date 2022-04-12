<template>
  <div id="TableConnection">
    <Table :title="title" :rows="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { useConnectionStore } from "@/pinia/connectionStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getRowsTableConnection } from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  components: { Table },
  setup() {
    const unitsStore = useUnitsStore();
    const connectionStore = useConnectionStore();
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    // TODO: Check to refactor
    const { engineUnit: eu, thermalUnit: tu } = storeToRefs(connectionStore);
    const rows = computed(() => {
      return getRowsTableConnection(engineUnit.value, thermalUnit.value, {
        engineUnit: eu.value,
        thermalUnit: tu.value,
      });
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
