<template>
  <div id="SettingsResult">
    <h2>Výsledek</h2>

    <div class="SettingsResultWrapper" :class="props.result.type">
      {{ props.result.message || "Žádný výsledek" }}
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { SettingsResult } from "@/types/settings/manager.types";

  const props = defineProps<{
    result: SettingsResult;
  }>();

  console.log(props);
</script>

<style lang="stylus">
  #SettingsResult
    flex-grow 1

    .SettingsResultWrapper
      display flex
      flex-direction column
      justify-content center
      padding 0px 12px
      border 0
      background-color color-bg-primary
      color color-text-white
      transition all 0.5s ease-in-out
      font-weight 700
      font-size 0.9em
      border-radius 8px
      height 40px
      width calc(100% - 24px)

    div.info
      background-color color-primary
    div.success
      background-color color-success
    div.error
      background-color color-error
    div.warning
      background-color color-warning
</style>
