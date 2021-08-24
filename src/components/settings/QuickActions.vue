<template>
  <div id="QuickActions">
    <h2>Rychlé akce</h2>
    <div class="action-wrapper">
      <button class="card-button">Otevřít Babybox</button>
      <button class="card-button">Otevřít servisní dveře</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
});
</script>

<style lang="stylus">
.card-button
  padding 10px
  min-width 230px
  min-height 100px
  background-color #010017
  border 1px solid #2d2b52
  border-radius 20px
  margin-right 30px
  font-size 1.1em
  font-weight 100
.card-button:hover
  background-color #020024

#QuickActions
  h2
    margin 0 0 10px 0
  .action-wrapper
    margin-bottom 15px
</style>
