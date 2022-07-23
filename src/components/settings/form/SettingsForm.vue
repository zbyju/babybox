<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions />
      <SettingsFilters />
      <SettingsResult />
    </div>
    <SettingsTable />
    <SettingsLog />
  </div>
</template>

<script lang="ts" setup>
  import SettingsActions from "@/components/settings/form/SettingsFormActions.vue";
  import SettingsFilters from "@/components/settings/form/SettingsFormFilters.vue";
  import SettingsLog from "@/components/settings/form/SettingsFormLog.vue";
  import SettingsResult from "@/components/settings/form/SettingsFormResult.vue";
  import SettingsTable from "@/components/settings/form/SettingsFormTable.vue";
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
