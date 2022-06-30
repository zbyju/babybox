<template>
  <div id="TableVoltage">
    <BaseTable :title="title" :rows="rows"></BaseTable>
  </div>
</template>

<script lang="ts">
import BaseTable from "@/components/panel/HTMLElements/BaseTable.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import { getRowsVoltage } from "@/utils/panel/tables";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  components: { BaseTable },
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
