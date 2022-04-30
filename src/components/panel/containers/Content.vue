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
import CameraWrapper from "@/components/panel/containers/CameraWrapper.vue";
import TableConnection from "@/components/panel/elements/TableConnection.vue";
import TableDoors from "@/components/panel/elements/TableDoors.vue";
import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
import TableVoltage from "@/components/panel/elements/TableVoltage.vue";
import { defineComponent } from "vue";

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
  margin-bottom 10px

  transition 1s all ease-in-out

  display flex
  justify-content space-between
  align-items flex-start
  height 38vh
  width calc(100% - 32px)
  gap 15px
  // grid-template-columns auto auto auto auto auto;
  // grid-template-rows: auto;
  // grid-template-areas: "table-temperature table-doors camera table-voltage table-connection"

  background background
  border-top 5px solid app-border-secondary
</style>
