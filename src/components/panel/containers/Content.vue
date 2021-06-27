<template>
  <div id="Content">
    <TableTemperature></TableTemperature>
    <Camera></Camera>
    <TableMisc></TableMisc>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import Camera from "@/components/panel/elements/Camera.vue";
import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
import TableMisc from "@/components/panel/elements/TableMisc.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    Camera,
    TableTemperature,
    TableMisc,
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
  grid-template-columns auto minmax(10%, 42%) auto;
  grid-template-rows: auto;
  grid-template-areas: "table-temperature camera table-misc"
</style>
