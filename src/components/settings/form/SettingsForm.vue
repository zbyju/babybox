<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions />
      <SettingsFilters />
      <SettingsResult />
    </div>
    <SettingsTable
      :headers="headers"
      :rows="rows"
      :values="values"
      @value-updated="valueUpdated"
    />
    <SettingsLog />
  </div>
</template>

<script lang="ts" setup>
  import SettingsActions from "@/components/settings/form/SettingsFormActions.vue";
  import SettingsFilters from "@/components/settings/form/SettingsFormFilters.vue";
  import SettingsLog from "@/components/settings/form/SettingsFormLog.vue";
  import SettingsResult from "@/components/settings/form/SettingsFormResult.vue";
  import SettingsTable from "@/components/settings/form/SettingsFormTable.vue";
  import {
    getSettingsTableHeaders,
    getSettingsTableTemplateRows,
    getSettingsTableValues,
  } from "@/defaults/settingsTable.defaults";
  import {
    type SettingsTableRow,
    type SettingsTableRowTemplate,
    SettingsTableRowState,
  } from "@/types/settings/table.types";
  import { isNumber } from "@/utils/number";

  const headers = getSettingsTableHeaders();
  const rows: Array<SettingsTableRow> = getSettingsTableTemplateRows().map(
    (r: SettingsTableRowTemplate, i: number): SettingsTableRow => {
      return {
        ...r,
        index: i,
      };
    },
  );

  const values = getSettingsTableValues(rows);

  function valueUpdated(newValue: string, index: number, label: string) {
    const value = values[index];
    value.value.value = newValue;
    console.log(value.value.value);
    if (!isNumber(newValue)) {
      console.log("not number", newValue);
      return (value.state.value = SettingsTableRowState.Error);
    }

    if (label.includes("M")) {
      if (newValue === value.engine.value) {
        value.state.value = SettingsTableRowState.Neutral;
      } else {
        value.state.value = SettingsTableRowState.Changed;
      }
    } else if (label.includes("T")) {
      if (newValue === value.thermal.value) {
        value.state.value = SettingsTableRowState.Neutral;
      } else {
        value.state.value = SettingsTableRowState.Changed;
      }
    }
  }
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
