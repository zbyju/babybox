<template>
  <div id="Content">
    <TableTemperature></TableTemperature>
    <TableDoors></TableDoors>
    <CameraWrapper></CameraWrapper>
    <TableVoltage></TableVoltage>
    <TableConnection></TableConnection>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
import TableConnection from "@/components/panel/elements/TableConnection.vue";
import TableDoors from "@/components/panel/elements/TableDoors.vue";
import TableVoltage from "@/components/panel/elements/TableVoltage.vue";
import CameraWrapper from "@/components/panel/containers/CameraWrapper.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    TableTemperature,
    TableConnection,
    TableDoors,
    TableVoltage,
    CameraWrapper,
  },
});
</script>

<style lang="stylus">
#Content
  grid-area: content
  overflow hidden

  padding padding-y padding-x

  transition 1s all ease-in-out

  display flex
  justify-content space-between
  align-items flex-start
  gap 10px
  max-height 37vh
  // grid-template-columns auto auto auto auto auto;
  // grid-template-rows: auto;
  // grid-template-areas: "table-temperature table-doors camera table-voltage table-connection"

  background background
  border-top 5px solid primary
</style>
