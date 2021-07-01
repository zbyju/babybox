<template>
  <div id="TableTemperature">
    <Table :titleProp="title" :headersProp="headers" :rowsProp="rows"></Table>
  </div>
</template>

<script lang="ts">
import Table from "@/components/panel/HTMLElements/Table.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: { Table },
  setup() {
    return {
      title: "Teploty",
      headers: [
        "Vnitřní",
        "Venkovní",
        "Vnitřní plášť",
        "Horní výměník",
        "Dolní výměník",
        "Nastavení vnitřní",
        "Hysterze topení",
        "Hysterze chlazení",
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
          value: "28°C",
        },
        {
          value: "-0.0°C",
        },
        {
          value: "+5.0°C",
        },
      ],
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
