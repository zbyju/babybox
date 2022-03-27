<template>
  <div id="TableTemperature">
    <div class="Table">
      <Table :titleProp="title" :rowsProp="rows" :blocksProp="blocks"></Table>
    </div>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import {
  getBlocksTableTemperature,
  getRowsTableTemperatures,
} from "@/utils/panel/tables";
import { computed, defineComponent } from "vue";
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
    const blocks = computed(() => {
      return getBlocksTableTemperature(
        store.state.engineUnit,
        store.state.thermalUnit
      );
    });
    return {
      title: "Topení/chlazení",
      rows,
      blocks,
    };
  },
});
</script>

<style lang="stylus"></style>
