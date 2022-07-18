<template>
  <div id="SettingsLogsHeader">
    <h2>Log</h2>
    <button class="btn-error btn-small" @click="props.manager.deleteLog">
      Smazat log
    </button>
  </div>
  <div id="SettingsLog">
    <div
      v-for="(msg, index) in props.manager.log.value"
      :key="index"
      class="log-message"
    >
      {{ msg }}
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { SettingsManager } from "@/logic/settings/manager";

  const props = defineProps<{
    manager: SettingsManager;
  }>();
</script>

<style lang="stylus">
  #SettingsLog
    background-color color-bg-primary
    min-height 150px
    max-height 500px
    overflow-y scroll
    width 100%
    border 1px solid color-border-primary
    border-radius 8px
    margin-top 12px
    .log-message
      border-bottom 1px solid color-border-secondary
      border-radius 8px
      padding 5px 10px 4px 10px
      transition all 0.5s
    .log-message:hover
      background-color color-bg-primary-hover
  #SettingsLogsHeader
    display flex
    flex-direction row
    flex-wrap wrap
    align-items center
    gap 20px
    margin-top 20px
    h2
      margin 0
</style>
