<template>
  <div id="QuickActions">
    <h2>Rychlé akce</h2>
    <div class="action-wrapper">
      <button class="card-button" @click="openBabybox">Otevřít Babybox</button>
      <button class="card-button" @click="openServiceDoors">
        Otevřít servisní dveře
      </button>
      <CameraWrapper :max-h="100" :max-w="200" :display-doors="false" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { openDoors, resetBabybox } from "@/api/units";

  import CameraWrapper from "../panel/containers/CameraWrapper.vue";

  const openBabybox = async () => {
    try {
      await openDoors();
    } catch (err) {
      console.log(err);
    }
  };
  const openServiceDoors = async () => {
    try {
      await resetBabybox();
    } catch (err) {
      console.log(err);
    }
  };
</script>

<style lang="stylus">
  .card-button
    padding 10px
    min-width 230px
    min-height 100px
    background-color color-bg-primary
    border 1px solid color-border-secondary
    border-radius 20px
    margin-right 30px
    font-size 1.1em
    font-weight 100
  .card-button:hover
    background-color color-bg-primary-hover

  #QuickActions
    h2
      margin 0 0 10px 0
    .action-wrapper
      display: flex
      flex-direction: row
      justify-content: flex-start
      margin-bottom 15px
</style>
