<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions
        @click:remove="onRemoveAction"
        @click:insert-recommended="onInsertRecommendedAction"
      />
      <SettingsFilters />
      <SettingsResult />
    </div>
    <SettingsTable
      :headers="headers"
      :rows="rows"
      :values="values"
      @value-updated="valueUpdated"
    />
    <SettingsLog
      :entries="logEntries"
      @click:delete-log="() => (logEntries = [])"
    />
  </div>
</template>

<script lang="ts" setup>
  import moment from "moment";
  import { type Ref, ref, watch } from "vue";

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
  import { type LogEntry, LogEntryType } from "@/types/settings/manager.types";
  import {
    type SettingsTableRow,
    type SettingsTableRowTemplate,
    type SettingsTableRowValue,
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

  const values: Ref<SettingsTableRowValue[]> = ref(
    getSettingsTableValues(rows),
  );

  watch(values, () =>
    values.value.forEach((v: SettingsTableRowValue, i: number) =>
      valueUpdated(v.value, i, rows[i].label),
    ),
  );

  function valueUpdated(newValue: string, index: number, label: string) {
    const value = values.value[index];
    value.value = newValue;
    if (!isNumber(newValue)) {
      return (value.state = SettingsTableRowState.Error);
    }

    if (label.includes("M")) {
      if (newValue === value.engine) {
        value.state = SettingsTableRowState.Neutral;
      } else {
        value.state = SettingsTableRowState.Changed;
      }
    } else if (label.includes("T")) {
      if (newValue === value.thermal) {
        value.state = SettingsTableRowState.Neutral;
      } else {
        value.state = SettingsTableRowState.Changed;
      }
    }
  }
  const logEntries: Ref<LogEntry[]> = ref([
    {
      message: "Formulář inicializován",
      date: moment(),
      type: LogEntryType.Info,
    },
  ]);

  function onRemoveAction() {
    values.value = getSettingsTableValues(rows);
  }

  function onInsertRecommendedAction() {
    values.value = values.value.map((v: SettingsTableRowValue, i: number) => {
      return {
        ...v,
        value: rows[i].recommended,
      };
    });
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
