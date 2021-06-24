<template>
  <div id="Header">
    <BigClock></BigClock>
    <Date></Date>
    <Time></Time>
    <Camera></Camera>
    <TableTemperature></TableTemperature>
    <TableMisc></TableMisc>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import BigClock from "@/components/panel/elements/BigClock.vue";
import Date from "@/components/panel/elements/Date.vue";
import Time from "@/components/panel/elements/Time.vue";
import Camera from "@/components/panel/elements/Camera.vue";
import TableTemperature from "@/components/panel/elements/TableTemperature.vue";
import TableMisc from "@/components/panel/elements/TableMisc.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    BigClock,
    Date,
    Time,
    Camera,
    TableTemperature,
    TableMisc,
  },
});
</script>

<style lang="stylus"></style>
