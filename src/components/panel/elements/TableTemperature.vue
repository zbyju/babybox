<template>
  <div id="TableTemperature">
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
      title: "Tabulka teplot",
      headers: ["Nastaveni", "Vnitrni", "Venkovni", "Skrine", "Horni", "Dolni"],
      rows: [
        {
          value: "28-0.0+5.0°C",
        },
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
      ],
    };
  },
});
</script>

<style lang="stylus">
#TableTemperature
  grid-area table-temperature

  align-self center
</style>
