<template>
  <div id="QuickActions">
    <h2>Rychlé akce</h2>
    <div class="action-wrapper">
      <BaseButton variant="error" size="card" @click="openBabybox">
        Otevřít Babybox
      </BaseButton>
      <BaseButton variant="warning" size="card" @click="openServiceDoors">
        Otevřít servisní dveře
      </BaseButton>
      <CameraWrapper :max-h="100" :max-w="200" :display-doors="false" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { openDoors, resetBabybox } from "@/api/units";
  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";

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
  #QuickActions
    h2
      margin 0 0 10px 0
    .action-wrapper
      display flex
      flex-direction row
      align-items stretch
      justify-content flex-start
      flex-wrap wrap
      gap 16px
      margin-bottom 15px
</style>
