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
  import { AxiosError } from "axios";
  import moment from "moment";
  import { type Ref, ref, watch } from "vue";

  import { getSettings, sendSettings } from "@/api/units";
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
  import { useConfigStore } from "@/pinia/configStore";
  import { type LogEntry, LogEntryType } from "@/types/settings/manager.types";
  import {
    type SettingsTableRow,
    type SettingsTableRowTemplate,
    type SettingsTableRowValue,
    SettingsTableRowState,
    SettingsTableRowValueType,
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
    values.value.forEach((v: SettingsTableRowValue, i: number) => {
      if (
        v.state === SettingsTableRowState.Changed ||
        v.state === SettingsTableRowState.Neutral
      ) {
        valueUpdated(v.value, i);
      }
    }),
  );

  function valueUpdated(newValue: string, index: number) {
    const value = values.value[index];
    const row = rows[index];
    value.value = newValue;
    if (newValue === "") {
      return (value.state = SettingsTableRowState.Neutral);
    }
    if (!isNumber(newValue)) {
      console.log("not number", newValue);
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
      console.log(response);
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
        console.log(err?.response?.status);
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
    const changedValues = [];
    let i = 0;
    for (const v of values.value) {
      if (v.state !== SettingsTableRowState.Changed || v.value === null) {
        ++i;
        continue;
      }
      const row = rows[i];
      let val = v.value;
      if (row.type === SettingsTableRowValueType.Temperature) {
        val = String(parseInt(v.value) * 100);
      }
      if (row.type === SettingsTableRowValueType.Voltage) {
        val = String(
          Math.round(
            (parseInt(v.value) *
              (useConfigStore()?.units?.voltage?.divider || 63)) /
              (useConfigStore()?.units?.voltage?.multiplier || 100),
          ),
        );
      }
      if (row.engine !== null) {
        changedValues.push({
          unit: "engine",
          index: row.engine,
          value: parseInt(val),
        });
      }
      if (row.thermal !== null) {
        changedValues.push({
          unit: "thermal",
          index: row.thermal,
          value: parseInt(val),
        });
      }
      ++i;
    }
    if (changedValues === [])
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
        values.value = values.value.map((v) => {
          if (v.state === SettingsTableRowState.Changed) {
            return {
              ...v,
              state: SettingsTableRowState.Success,
            };
          }
          return v;
        });
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
