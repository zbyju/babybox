<template>
  <div id="Header">
    <BigClock></BigClock>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import BigClock from "@/components/panel/elements/BigClock.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    BigClock,
  },
});
</script>

<style lang="stylus"></style>
