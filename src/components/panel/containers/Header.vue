<template>
  <div id="Header">
    <BabyboxName></BabyboxName>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import BabyboxName from "@/components/panel/elements/BabyboxName.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    BabyboxName,
  },
});
</script>

<style lang="stylus"></style>
