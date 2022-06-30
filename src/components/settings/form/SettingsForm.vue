<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions :manager="manager"></SettingsActions>
      <SettingsFilters :manager="manager"></SettingsFilters>
      <SettingsResult :manager="manager"></SettingsResult>
    </div>
    <BaseTable :manager="manager"></BaseTable>
    <SettingsLog :manager="manager"></SettingsLog>
  </div>
</template>

<script lang="ts">
import SettingsActions from "@/components/settings/form/SettingsActions.vue";
import SettingsFilters from "@/components/settings/form/SettingsFilters.vue";
import SettingsLog from "@/components/settings/form/SettingsLog.vue";
import SettingsResult from "@/components/settings/form/SettingsResult.vue";
import SettingsTable from "@/components/settings/form/SettingsTable.vue";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  components: {
    SettingsActions,
    SettingsFilters,
    SettingsLog,
    SettingsResult,
    SettingsTable,
  },
});
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
