<template>
  <div id="Content">
    <TableTemperature></TableTemperature>
    <TableVoltage></TableVoltage>
    <Camera></Camera>
    <TableDoors></TableDoors>
    <TableConnection></TableConnection>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import Camera from "@/components/panel/elements/Camera.vue";
import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
import TableConnection from "@/components/panel/elements/TableConnection.vue";
import TableDoors from "@/components/panel/elements/TableDoors.vue";
import TableVoltage from "@/components/panel/elements/TableVoltage.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    Camera,
    TableTemperature,
    TableConnection,
    TableDoors,
    TableVoltage,
  },
});
</script>

<style lang="stylus">
  test = min-content
#Content
  grid-area: content
  overflow hidden

  padding padding-y padding-x

  transition 1s all ease-in-out

  display grid
  grid-template-columns auto auto minmax(10%, 40%) auto auto;
  grid-template-rows: auto;
  grid-template-areas: "table-temperature table-doors camera table-voltage table-connection"
</style>
