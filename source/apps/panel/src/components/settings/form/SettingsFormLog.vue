<template>
  <div id="SettingsLogsHeader">
    <h2>Log</h2>
    <button class="btn-error btn-small" @click="$emit('click:deleteLog')">
      Smazat log
    </button>
  </div>
  <div id="SettingsLog">
    <div
      v-for="entry in props.entries"
      :key="entry.date.toString()"
      class="log-entry"
      :class="entry.type"
    >
      <span class="log-date">{{ entry.date.format("HH:mm:ss") }}</span>
      <span class="log-message">{{ entry.message }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { LogEntry } from "@/types/settings/manager.types";

  const props = defineProps<{
    entries: LogEntry[];
  }>();

  const emit = defineEmits<{
    (e: "click:deleteLog"): void;
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
    .log-entry
      border-bottom 1px solid color-border-secondary
      border-radius 8px
      transition all 0.5s
      display flex
      flex-direction row

      .log-date, .log-message
        padding 7px 10px

    .log-entry:hover
      background-color color-bg-primary-hover

    .log-entry.info .log-date
      background-color color-bg-info
    .log-entry.success .log-date
      background-color color-bg-success
    .log-entry.warning .log-date
      background-color color-bg-warning
    .log-entry.error .log-date
      background-color color-bg-error

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
