<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions :manager="props.manager" />
      <SettingsFilters :manager="props.manager" />
      <SettingsResult :manager="props.manager" />
    </div>
    <SettingsTable :manager="props.manager" />
    <SettingsLog :manager="props.manager" />
  </div>
</template>

<script lang="ts" setup>
  import SettingsActions from "@/components/settings/form/SettingsActions.vue";
  import SettingsFilters from "@/components/settings/form/SettingsFilters.vue";
  import SettingsLog from "@/components/settings/form/SettingsLog.vue";
  import SettingsResult from "@/components/settings/form/SettingsResult.vue";
  import SettingsTable from "@/components/settings/form/SettingsTable.vue";
  import type { SettingsManager } from "@/utils/settings/settings";

  const props = defineProps<{
    manager: SettingsManager;
  }>();
</script>

<style lang="stylus">
  #SettingsForm
    .settings-row
      display flex
      flex-direction row
      justify-content flex-start
      margin-bottom 20px
      gap 30px
      flex-wrap wrap
    h2
      margin-top 0
</style>
