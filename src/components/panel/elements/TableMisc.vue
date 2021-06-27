<template>
  <div id="TableMisc">
    <Table :titleProp="title" :headersProp="headers" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/Table.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: { Table },
  setup() {
    return {
      title: "Tabulka ostatni",
      headers: [
        "Vnitrni",
        "Vnitrni",
        "Vnitrni",
        "Vnitrni",
        "Venkovni",
        "Skrine",
        "Horni",
        "Dolni",
        "Nastaveni",
      ],
      rows: [
        {
          value: "27.1°C",
        },
        {
          value: "8.1°C",
        },
        {
          value: "48.3°C",
        },
        {
          value: "29.8°C",
        },
        {
          value: "37.9°C",
        },
        {
          value: "28-0.0+5.0°C",
        },
        {
          value: "28-0.0+5.0°C",
        },
        {
          value: "28-0.0+5.0°C",
        },
        {
          value: "28-0.0+5.0°C",
        },
      ],
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
