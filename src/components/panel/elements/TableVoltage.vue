<template>
  <div id="TableVoltage">
    <Table :titleProp="title" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getRowsVoltage } from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  components: { Table },
  setup() {
    const unitsStore = useUnitsStore();
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const rows = computed(() => {
      return getRowsVoltage(engineUnit.value, thermalUnit.value);
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
