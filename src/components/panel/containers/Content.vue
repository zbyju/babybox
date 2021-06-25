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

  padding padding-y padding-x

  transition 1s all

  display flex
  flex-direction row
  flex-wrap nowrap
  justify-content space-between
</style>
