<template>
  <textarea class="my-textarea"></textarea>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({});
</script>

<style lang="stylus">
.my-textarea
  background color-bg-primary 
  color color
  border 1px solid color-border-secondary

  width 70%
  max-width 70%
  min-height 32px
  max-height 200px
  font-size 1.1vw
  font-weight 600
  padding 5px
  font-family "Open Sans", Arial

  resize vertical
</style>
