<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <SettingsActions
        @click:remove="onRemoveAction"
        @click:insert-recommended="onInsertRecommendedAction"
        @click:load="onLoadAction"
        @click:save="onSaveAction"
      />
      <SettingsFilters />
      <SettingsFormResult :result="settingsResult" />
    </div>
    <SettingsTable
      :headers="headers"
      :rows="rows"
      :values="values"
      @value-updated="onValueUpdated"
    />
    <SettingsLog
      :entries="logEntries"
      @click:delete-log="() => (logEntries = [])"
    />
  </div>
</template>

<script lang="ts" setup>
  import { AxiosError } from "axios";
  import moment from "moment";
  import { type Ref, ref, watch } from "vue";

  import { getSettings, sendSettings } from "@/api/units";
  import SettingsActions from "@/components/settings/form/SettingsFormActions.vue";
  import SettingsFilters from "@/components/settings/form/SettingsFormFilters.vue";
  import SettingsLog from "@/components/settings/form/SettingsFormLog.vue";
  import SettingsFormResult from "@/components/settings/form/SettingsFormResult.vue";
  import SettingsTable from "@/components/settings/form/SettingsFormTable.vue";
  import {
    getSettingsTableHeaders,
    getSettingsTableTemplateRows,
    getSettingsTableValues,
  } from "@/defaults/settingsTable.defaults";
  import {
    type LogEntry,
    type SettingsResult,
    type SettingsToSend,
    LogEntryType,
  } from "@/types/settings/manager.types";
  import {
    type SettingsTableRow,
    type SettingsTableRowTemplate,
    type SettingsTableRowValue,
    SettingsTableRowState,
  } from "@/types/settings/table.types";
  import { isNumber } from "@/utils/number";
  import {
    getChangedSettings,
    isSettingChanged,
    settingsSendToStates,
  } from "@/utils/settings/settings";

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
    values.value.forEach((v: SettingsTableRowValue, i: number) => {
      if (
        v.state === SettingsTableRowState.Changed ||
        v.state === SettingsTableRowState.Neutral
      )
        onValueUpdated(v.value, i);
    }),
  );

  function onValueUpdated(newValue: string, index: number) {
    const value = values.value[index];
    const row = rows[index];
    value.value = newValue;
    if (newValue === "") {
      return (value.state = SettingsTableRowState.Neutral);
    }
    if (!isNumber(newValue)) {
      return (value.state = SettingsTableRowState.Error);
    }

    const isChanged = isSettingChanged(
      value.engine ? Number(value.engine) : null,
      value.thermal ? Number(value.thermal) : null,
      newValue,
      row.type,
    );
    if (isChanged) {
      return (value.state = SettingsTableRowState.Changed);
    } else {
      return (value.state = SettingsTableRowState.Neutral);
    }
  }
  const logEntries: Ref<LogEntry[]> = ref([
    {
      message: "Formulář inicializován",
      date: moment(),
      type: LogEntryType.Info,
    },
  ]);

  const settingsResult: Ref<SettingsResult> = ref({
    type: LogEntryType.Info,
    message: "Formulář inicializován",
  });

  function addLogMessage(
    message: string,
    type: LogEntryType = LogEntryType.Info,
  ) {
    logEntries.value.unshift({
      message,
      type,
      date: moment(),
    });
    settingsResult.value = {
      type,
      message,
    };
  }

  function onRemoveAction() {
    addLogMessage("Smazány hodnoty z formuláře");
    values.value = values.value.map((v) => ({
      ...v,
      value: "",
    }));
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
              row.engine !== null ? engineData[row.engine - 100] : null;
            const thermal =
              row.thermal !== null ? thermalData[row.thermal - 100] : null;
            return {
              ...v,
              engine,
              thermal,
            };
          },
        );
        addLogMessage("Parametry úspěšně načteny", LogEntryType.Success);
      } else {
        throw { msg: "Status code not OK" };
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 0) {
          addLogMessage(
            "Parametry nemohly být načteny - problém s backend serverem",
            LogEntryType.Error,
          );
        } else if (err.response?.status === 500) {
          addLogMessage(
            "Parametry nemohly být načteny - problém s připojením k jednotkám",
            LogEntryType.Error,
          );
        }
      } else {
        addLogMessage(
          "Parametry nemohly být načteny - neznámý error",
          LogEntryType.Error,
        );
      }
    }
  }

  async function onSaveAction() {
    const changedValues: SettingsToSend[] = getChangedSettings(
      values.value,
      rows,
    );
    if (changedValues.length === 0)
      return addLogMessage(
        "Nebyly provedeny žádné změny, žádné nové parametry!",
        LogEntryType.Error,
      );
    try {
      addLogMessage(
        `Odesílám změnu ${changedValues.length} parametrů`,
        LogEntryType.Info,
      );
      const response = await sendSettings(changedValues);
      if (response.status >= 200 && response.status <= 299) {
        addLogMessage(`Parametry úspěšně uloženy`, LogEntryType.Success);
        onLoadAction();

        values.value = settingsSendToStates(response, values.value, rows);
      } else {
        throw { msg: "Status code is not OK" };
      }
    } catch (err) {
      addLogMessage("Chyba při ukládání parametrů");
      onLoadAction();
      values.value = values.value.map((v) => {
        return {
          ...v,
          state: SettingsTableRowState.Error,
        };
      });
    }
  }

  onLoadAction();
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
