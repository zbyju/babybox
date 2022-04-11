<template>
  <div id="TableConnection">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { useConnectionStore } from "@/pinia/connectionStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { Connection } from "@/types/panel/connection";
import { getRowsTableConnection } from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";

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
