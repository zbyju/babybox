<template>
  <div id="ConfigForm">
    <div class="config-row">
      <div id="ConfigActions">
        <h2>Akce</h2>
        <div class="action-wrapper">
          <button class="btn-success" disabled>Uložit konfiguraci</button>
          <button
            class="btn-primary"
            :disabled="loaded === null"
            @click="onDiscard"
          >
            Zahodit změny
          </button>
          <button
            class="btn-warning"
            :disabled="loaded === null"
            @click="onResetToDefaults"
          >
            Vrátit výchozí hodnoty
          </button>
        </div>
        <p class="save-disabled">
          Ukládání zatím není zapojené. Formulář nic neodesílá, změny zůstávají
          jen v prohlížeči.
        </p>
      </div>
      <SettingsFormResult :result="result" />
    </div>

    <p v-if="state !== null" class="config-summary">
      Změněných polí: {{ state.changed.length }}.
      <span v-if="state.hasErrors" class="summary-error">
        Formulář obsahuje chyby.
      </span>
    </p>

    <div v-if="state !== null" class="config-sections">
      <ConfigFormSection
        v-for="group in sections"
        :key="group.section.key"
        :section="group.section"
        :states="group.states"
        @update="onFieldUpdate"
      />
    </div>

    <SettingsFormLog
      :entries="logEntries"
      @click:delete-log="() => (logEntries = [])"
    />
  </div>
</template>

<script lang="ts" setup>
  import {
    type MainConfig,
    configForm,
    parseMainConfig,
  } from "@babybox/config-schema";
  import moment from "moment";
  import { type Ref, computed, ref } from "vue";

  import { getConfig } from "@/api/config";
  import ConfigFormSection from "@/components/config/ConfigFormSection.vue";
  import SettingsFormLog from "@/components/settings/form/SettingsFormLog.vue";
  import SettingsFormResult from "@/components/settings/form/SettingsFormResult.vue";
  import {
    type FormValues,
    defaultFormValues,
    formState,
    toFormValues,
  } from "@/logic/config/configForm";
  import {
    type LogEntry,
    type SettingsResult,
    LogEntryType,
  } from "@/types/settings/manager.types";

  const loaded: Ref<MainConfig | null> = ref(null);
  const values: Ref<FormValues> = ref({});

  const state = computed(() =>
    loaded.value === null ? null : formState(loaded.value, values.value),
  );

  const sections = computed(() => {
    const current = state.value;
    if (current === null) return [];
    return configForm.map((section) => ({
      section,
      states: current.fields.filter((field) =>
        field.field.path.startsWith(`${section.key}.`),
      ),
    }));
  });

  const logEntries: Ref<LogEntry[]> = ref([]);

  const result: Ref<SettingsResult> = ref({
    type: LogEntryType.Info,
    message: "Formulář inicializován",
  });

  function addLogMessage(
    message: string,
    type: LogEntryType = LogEntryType.Info,
  ) {
    logEntries.value.unshift({ message, type, date: moment() });
    result.value = { type, message };
  }

  function onFieldUpdate(path: string, value: string) {
    values.value = { ...values.value, [path]: value };
  }

  function onDiscard() {
    if (loaded.value === null) return;
    values.value = toFormValues(loaded.value);
    addLogMessage("Změny zahozeny");
  }

  function onResetToDefaults() {
    if (loaded.value === null) return;
    values.value = defaultFormValues(loaded.value);
    addLogMessage(
      "Vloženy výchozí hodnoty. Zatím se nikam neukládají.",
      LogEntryType.Warning,
    );
  }

  /*
   * The form draws only a config the schema accepts.
   * A stored config with a bad value is a box where every PATCH is already
   * rejected, so an editable form could not save it either; the errors say which
   * field to fix in main.json.
   */
  async function load() {
    addLogMessage("Načítám konfiguraci z configeru");

    let body: unknown;
    try {
      body = await getConfig();
    } catch {
      addLogMessage(
        "Konfiguraci nelze načíst - configer neodpovídá",
        LogEntryType.Error,
      );
      return;
    }

    const parsed = parseMainConfig(body);
    if (!parsed.ok) {
      addLogMessage(
        "Uložená konfigurace neodpovídá schématu. Oprav ji ručně v main.json a restartuj configer.",
        LogEntryType.Error,
      );
      for (const error of parsed.errors) {
        addLogMessage(`${error.path}: ${error.msg}`, LogEntryType.Error);
      }
      return;
    }

    loaded.value = parsed.config;
    values.value = toFormValues(parsed.config);
    addLogMessage("Konfigurace načtena", LogEntryType.Success);
  }

  load();
</script>

<style lang="stylus">
  #ConfigForm
    .config-row
      display flex
      flex-direction row
      justify-content flex-start
      margin-bottom 20px
      gap 30px
      flex-wrap wrap

    h2
      margin-top 0

    #ConfigActions
      div.action-wrapper
        display flex
        flex-direction row
        flex-wrap wrap
        gap 10px

      p.save-disabled
        margin 8px 0 0 0
        max-width 420px
        font-size 0.8em
        color color-text-warning

    button
      display inline-block
      padding 10px 12px
      border 0
      background-color color-bg-primary
      color color-text-white
      transition all 0.5s ease-in-out
      font-weight 700
      font-size 0.9em
      border-radius 8px
      height 40px
    button:hover
      cursor pointer

    button.btn-primary
      background-color color-primary
    button.btn-success
      background-color color-success
    button.btn-error
      background-color color-error
    button.btn-warning
      background-color color-warning
      color color-bg-black
    button.btn-primary:hover
      background-color color-primary-hover
    button.btn-success:hover
      background-color color-success-hover
    button.btn-error:hover
      background-color color-error-hover
    button.btn-warning:hover
      background-color color-warning-hover
    button:disabled
      background-color color-bg-primary-hover
      color color-text-secondary
      cursor not-allowed
    button:disabled:hover
      background-color color-bg-primary-hover
      cursor not-allowed

    p.config-summary
      margin 0 0 16px 0
      font-size 0.9em

    .summary-error
      font-weight 700
      color color-text-error

    .config-sections
      display grid
      grid-template-columns repeat(auto-fill, minmax(360px, 1fr))
      gap 16px
      align-items start
</style>
