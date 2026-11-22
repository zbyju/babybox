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
  import moment from "moment";
  import { type Ref, ref, watch } from "vue";

  import { HttpError, ProtocolError } from "@/api/http";
  import { getSettings, sendSettings, type SettingsRead } from "@/api/units";
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
  import { whenNotNullish } from "@/utils/general";
  import { isNumber } from "@/utils/number";
  import {
    getChangedSettings,
    isSettingChanged,
    settingsSendToStates,
    settingsSendToStatesError,
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
    if (value === undefined || row === undefined) return;
    value.value = newValue;
    if (newValue === "") {
      return (value.state = SettingsTableRowState.Neutral);
    }
    if (!isNumber(newValue)) {
      return (value.state = SettingsTableRowState.Error);
    }

    const isChanged = isSettingChanged(
      whenNotNullish(value.engine, Number(value.engine)),
      whenNotNullish(value.thermal, Number(value.thermal)),
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
      const row = rows[i];
      if (row === undefined) return v;
      return {
        ...v,
        value: row.recommended,
      };
    });
  }

  async function onLoadAction() {
    addLogMessage("Načítám aktuální hodnoty parametrů");

    let settings: SettingsRead<"both">;
    try {
      settings = await getSettings();
    } catch (error) {
      if (error instanceof HttpError && error.status === 500) {
        addLogMessage(
          "Parametry nemohly být načteny - problém s připojením k jednotkám",
          LogEntryType.Error,
        );
      } else if (error instanceof HttpError || error instanceof ProtocolError) {
        addLogMessage(
          "Parametry nemohly být načteny - neznámá chyba",
          LogEntryType.Error,
        );
      } else {
        addLogMessage(
          "Parametry nemohly být načteny - problém s backend serverem",
          LogEntryType.Error,
        );
      }
      return;
    }

    values.value = values.value.map((value, index) => {
      const row = rows[index];
      if (row === undefined) return value;
      return {
        ...value,
        engine: row.engine === null ? null : settings.engine[row.engine - 100],
        thermal:
          row.thermal === null ? null : settings.thermal[row.thermal - 100],
      };
    });
    addLogMessage("Parametry úspěšně načteny", LogEntryType.Success);
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
    addLogMessage(
      `Odesílám změnu ${changedValues.length} parametrů`,
      LogEntryType.Info,
    );

    let outcome: Awaited<ReturnType<typeof sendSettings>>;
    try {
      outcome = await sendSettings(changedValues);
    } catch {
      outcome = { kind: "unconfirmed" };
    }

    switch (outcome.kind) {
      case "confirmed":
        values.value = settingsSendToStates(
          outcome.results,
          values.value,
          rows,
        );
        addLogMessage("Parametry úspěšně uloženy", LogEntryType.Success);
        break;
      case "rejected":
        values.value = settingsSendToStates(
          outcome.results,
          values.value,
          rows,
        );
        addLogMessage(
          "Některé změny parametrů byly odmítnuty",
          LogEntryType.Error,
        );
        break;
      case "unconfirmed":
        values.value = settingsSendToStatesError(
          changedValues,
          values.value,
          rows,
        );
        addLogMessage(
          "Uložení parametrů se nepodařilo potvrdit",
          LogEntryType.Error,
        );
        break;
      default:
        outcome satisfies never;
    }
    await onLoadAction();
  }

  void onLoadAction();
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
      align-items flex-start
    h2
      margin-top 0
</style>
