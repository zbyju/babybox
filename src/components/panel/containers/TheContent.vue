<template>
  <div id="Content">
    <TableTemperature />
    <TableDoors />
    <CameraWrapper :display-doors="true" />
    <TableVoltage />
    <TableConnection />
  </div>
</template>

<script lang="ts" setup>
  import CameraWrapper from "@/components/panel/containers/CameraWrapper.vue";
  import TableConnection from "@/components/panel/elements/TableConnection.vue";
  import TableDoors from "@/components/panel/elements/TableDoors.vue";
  import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
  import TableVoltage from "@/components/panel/elements/TableVoltage.vue";
</script>

<style lang="stylus">
  #Content
    grid-area: content
    overflow hidden

    padding padding-y padding-x
    padding-bottom "calc(%s + 20px)" % (padding-y)

    transition 1s all ease-in-out

    display flex
    justify-content space-between
    align-items flex-start
    height 38vh
    width "calc(100% - (2 * %s))" % (padding-x)
    gap 15px
    // grid-template-columns auto auto auto auto auto;
    // grid-template-rows: auto;
    // grid-template-areas: "table-temperature table-doors camera table-voltage table-connection"

    background color-bg-black
    border-top 5px solid color-border-secondary
</style>
