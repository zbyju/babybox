<template>
  <div id="ConfigForm">
    <div class="config-row">
      <div id="ConfigActions">
        <h2>Akce</h2>
        <div class="action-wrapper">
          <button
            class="btn-success"
            :disabled="loaded === null || saving"
            @click="onSave"
          >
            Uložit konfiguraci
          </button>
          <button
            class="btn-primary"
            :disabled="loaded === null || saving"
            @click="onDiscard"
          >
            Zahodit změny
          </button>
          <button
            class="btn-warning"
            :disabled="loaded === null || saving"
            @click="onResetToDefaults"
          >
            Vrátit výchozí hodnoty
          </button>
        </div>
      </div>
      <SettingsFormResult :result="result" />
    </div>

    <p v-if="state !== null" class="config-summary">
      Změněných polí: {{ state.changed.length }}.
      <span v-if="state.hasErrors" class="summary-error">
        Formulář obsahuje chyby.
      </span>
    </p>

    <div
      v-if="state !== null && state.otherErrors.length > 0"
      class="config-other-errors"
    >
      <p>Chyby v polích, která formulář nezobrazuje:</p>
      <ul>
        <li
          v-for="error in state.otherErrors"
          :key="`${error.path}: ${error.msg}`"
        >
          {{ error.path }}: {{ error.msg }}
        </li>
      </ul>
    </div>

    <div v-if="state !== null" class="config-sections">
      <ConfigFormSection
        v-for="group in sections"
        :key="group.section.key"
        :section="group.section"
        :states="group.states"
        :saving="saving"
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
    type ConfigError,
    type MainConfig,
    configForm,
    parseMainConfig,
  } from "@babybox/config-schema";
  import moment from "moment";
  import { type Ref, computed, ref } from "vue";

  import { getConfig, saveConfig } from "@/api/config";
  import { reloadBackendConfig } from "@/api/reload";
  import ConfigFormSection from "@/components/config/ConfigFormSection.vue";
  import SettingsFormLog from "@/components/settings/form/SettingsFormLog.vue";
  import SettingsFormResult from "@/components/settings/form/SettingsFormResult.vue";
  import {
    type FormValues,
    buildConfig,
    defaultFormValues,
    formState,
    toFormValues,
  } from "@/logic/config/configForm";
  import { confirmQuestion } from "@/logic/config/confirmSave";
  import { bannerFor, rememberBanner } from "@/logic/config/restartBanner";
  import { type SaveFlowResult, runSave } from "@/logic/config/saveFlow";
  import {
    type LogEntry,
    type SettingsResult,
    LogEntryType,
  } from "@/types/settings/manager.types";

  const loaded: Ref<MainConfig | null> = ref(null);
  const values: Ref<FormValues> = ref({});
  const saving = ref(false);

  /* What configer refused last time, shown on the fields it named. */
  const serverErrors: Ref<ConfigError[]> = ref([]);

  const state = computed(() =>
    loaded.value === null
      ? null
      : formState(loaded.value, values.value, serverErrors.value),
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
    serverErrors.value = serverErrors.value.filter(
      (error) => error.path !== path,
    );
  }

  function onDiscard() {
    if (loaded.value === null) return;
    values.value = toFormValues(loaded.value);
    serverErrors.value = [];
    addLogMessage("Změny zahozeny");
  }

  function onResetToDefaults() {
    if (loaded.value === null) return;
    values.value = defaultFormValues(loaded.value);
    serverErrors.value = [];
    addLogMessage(
      "Vloženy výchozí hodnoty. Uloží se, až stiskneš Uložit konfiguraci.",
      LogEntryType.Warning,
    );
  }

  /*
   * Only the Vue side of a save: the confirm dialog, the re-entrancy guard, the log,
   * the banner and the reload. Everything the save decides is in
   * logic/config/saveFlow.ts, and what to ask about is in confirmSave.ts.
   *
   * The draft is built before the first await, so the body sent is the form as it
   * was when Save was pressed. The inputs are disabled meanwhile, so a later edit
   * cannot be lost without the maintainer noticing.
   */
  async function onSave() {
    if (saving.value) return;

    const current = state.value;
    if (loaded.value === null || current === null) return;

    /*
     * Nothing to confirm on a save that cannot be sent: runSave stops on hasErrors
     * and the maintainer would answer a question about a save that never happens.
     */
    if (!current.hasErrors) {
      const question = confirmQuestion(current);
      if (question !== null && !window.confirm(question)) {
        addLogMessage(
          "Uložení zrušeno, nic se neodeslalo.",
          LogEntryType.Warning,
        );
        return;
      }
    }

    const draft = buildConfig(loaded.value, values.value);
    saving.value = true;
    result.value = {
      type: LogEntryType.Info,
      message: "Ukládám konfiguraci",
    };

    let flow: SaveFlowResult;
    try {
      flow = await runSave(draft, current.hasErrors, {
        saveConfig,
        reloadBackendConfig,
      });
    } finally {
      saving.value = false;
    }

    for (const line of flow.log) addLogMessage(line.message, line.type);
    serverErrors.value = flow.serverErrors;

    const outcome = flow.outcome;
    if (outcome.kind === "notSent" || outcome.kind === "rejected") return;

    /* The banner goes to sessionStorage first, because the reload wipes it all. */
    rememberBanner(bannerFor(outcome));
    window.location.reload();
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

    .config-other-errors
      margin 0 0 16px 0
      font-size 0.9em
      color color-text-error

      p
        margin 0
        font-weight 700

      ul
        margin 4px 0 0 0
        padding-left 20px

    .config-sections
      display grid
      grid-template-columns repeat(auto-fill, minmax(360px, 1fr))
      gap 16px
      align-items start
</style>
