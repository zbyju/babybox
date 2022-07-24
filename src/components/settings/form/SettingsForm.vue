<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions
        @click:remove="onRemoveAction"
        @click:insert-recommended="onInsertRecommendedAction"
        @click:load="onLoadAction"
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

  import { getSettings } from "@/api/units";
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
      valueUpdated(v.value, i),
    ),
  );

  function valueUpdated(newValue: string, index: number) {
    const value = values.value[index];
    const row = rows[index];
    value.value = newValue;
    if (newValue === "") {
      return (value.state = SettingsTableRowState.Neutral);
    }
    if (!isNumber(newValue)) {
      return (value.state = SettingsTableRowState.Error);
    }

    if (row.engine !== null) {
      if (newValue === value.engine) {
        value.state = SettingsTableRowState.Neutral;
      } else {
        value.state = SettingsTableRowState.Changed;
      }
    } else if (row.thermal !== null) {
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

  function addLogMessage(
    message: string,
    type: LogEntryType = LogEntryType.Info,
  ) {
    logEntries.value.unshift({
      message,
      type,
      date: moment(),
    });
  }

  function onRemoveAction() {
    addLogMessage("Smazány hodnoty z formuláře");
    values.value = getSettingsTableValues(rows);
  }

  function onInsertRecommendedAction() {
    addLogMessage("Vloženy doporučené hodnoty");
    values.value = values.value.map((v: SettingsTableRowValue, i: number) => {
      return {
        ...v,
        value: rows[i].recommended,
      };
    });
  }

  async function onLoadAction() {
    addLogMessage("Načítám aktuální hodnoty parametrů");

    try {
      const response = await getSettings();
      if (response.status >= 200 && response.status <= 299) {
        values.value = values.value.map(
          (v: SettingsTableRowValue, i: number) => {
            const engineData = response.data.data.engine.split("|");
            const thermalData = response.data.data.thermal.split("|");
            const row = rows[i];
            const engine =
              row.engine !== null ? engineData[row.engine - 100] : "—";
            const thermal =
              row.thermal !== null ? thermalData[row.thermal - 100] : "—";
            return {
              ...v,
              engine,
              thermal,
            };
          },
        );
        addLogMessage("Parametry úspěšně načteny");
      } else {
        throw { msg: "Status code not OK" };
      }
    } catch (err) {
      console.log(err);
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
