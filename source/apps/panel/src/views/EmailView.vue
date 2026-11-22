<template>
  <div class="email-workspace">
    <section v-if="section === 'overview'" class="routing-card">
      <div class="section-title">
        <h2 id="email-routing-title">Jak se odesílají e-maily?</h2>
        <InlineHelp label="Jak nastavit cíl SMTP">
          Cíl SMTP se nastavuje přímo na jednotkách a kameře. Uložení zde jejich
          nastavení nemění.
        </InlineHelp>
      </div>
      <fieldset
        v-if="settings"
        class="routing"
        aria-labelledby="email-routing-title"
        :disabled="busy"
      >
        <div class="routing-options">
          <label
            v-for="option in routingOptions"
            :key="option.value"
            class="routing-option"
            :class="{ selected: routing === option.value }"
          >
            <input
              type="radio"
              name="email-routing"
              :checked="routing === option.value"
              :value="option.value"
              @change="selectRouting(option.value)"
            />
            <span>
              <strong>{{ option.title }}</strong>
              <span class="hint">{{ option.description }}</span>
            </span>
          </label>
        </div>
        <BaseButton
          v-if="routing === 'direct' && routing !== savedRouting"
          variant="accent"
          :disabled="busy"
          @click="save"
        >
          Uložit nastavení
        </BaseButton>
      </fieldset>
      <p
        v-if="settingsMessage && (!settings || routing === 'direct')"
        class="notice"
        role="status"
      >
        {{ settingsMessage }}
      </p>
      <p v-else-if="!settings" role="status">Načítání nastavení…</p>
    </section>

    <template v-if="relayWorkspace">
      <p v-if="receiving && !status && !statusUnavailable" role="status">
        Načítání stavu…
      </p>
      <p
        v-if="receiving && statusUnavailable"
        class="notice warning"
        role="status"
      >
        Stav e-mailové služby nelze načíst. Panel se znovu pokusí o spojení.
      </p>

      <section
        v-if="section === 'overview' && settings"
        class="card smtp-setup"
      >
        <div class="section-title">
          <h3>SMTP nastavení</h3>
          <InlineHelp label="Připojení SMTP">
            Panel odesílá zprávy přes TLS na portu 465.
          </InlineHelp>
        </div>
        <form @submit.prevent="save">
          <fieldset v-if="routing === 'panel'" :disabled="busy">
            <legend>Adresáti</legend>
            <div class="account-fields">
              <label
                >Adresáti jednotek
                <BaseInput
                  v-model="settings.unitRecipients"
                  type="text"
                  placeholder="adresy oddělené čárkou"
                  maxlength="8000"
                />
              </label>
              <label
                >Adresáti kamery
                <BaseInput
                  v-model="settings.cameraRecipients"
                  type="text"
                  placeholder="adresy oddělené čárkou"
                  maxlength="8000"
                />
              </label>
            </div>
          </fieldset>
          <fieldset
            :disabled="busy"
            class="account-fields"
            aria-label="Odchozí účet"
          >
            <label
              >SMTP server
              <BaseInput
                v-model="settings.host"
                type="text"
                maxlength="253"
                autocomplete="off"
              />
            </label>
            <label
              >SMTP uživatel
              <BaseInput
                v-model="settings.user"
                type="text"
                maxlength="1000"
                autocomplete="off"
              />
            </label>
            <label
              >SMTP heslo
              <BaseInput
                v-model="settings.password"
                type="password"
                maxlength="1000"
                autocomplete="new-password"
              />
            </label>
            <label
              >Náhradní odesílatel (volitelné)
              <BaseInput
                v-model="settings.senderOverride"
                type="text"
                maxlength="320"
              />
            </label>
          </fieldset>
          <BaseButton variant="accent" type="submit" :disabled="busy"
            >Uložit nastavení</BaseButton
          >
        </form>
        <p v-if="settingsMessage" class="notice" role="status">
          {{ settingsMessage }}
        </p>
        <div v-if="receiving && status" class="smtp-health">
          <span>{{ status.listener }}</span>
          <span :class="{ warning: status.error }">{{ outboundStatus }}</span>
          <InlineHelp v-if="status.error" label="Podrobnosti chyby SMTP">{{
            status.error
          }}</InlineHelp>
        </div>
        <details v-if="receiving" class="smtp-test">
          <summary>Zkušební e-mail</summary>
          <form @submit.prevent="act('test', { recipient: testRecipient })">
            <fieldset :disabled="busy">
              <label
                >Adresa pro test
                <BaseInput
                  v-model="testRecipient"
                  type="email"
                  required
                  autocomplete="off"
                />
              </label>
              <BaseButton
                variant="primary"
                type="submit"
                :disabled="busy || !status?.runtimeSupported"
                >Zařadit test do fronty</BaseButton
              >
            </fieldset>
          </form>
          <p v-if="testMessage" class="notice" role="status">
            {{ testMessage }}
          </p>
          <p
            v-if="testRecord"
            class="status"
            :class="statusTone(recordStatus(testRecord))"
            role="status"
          >
            <span aria-hidden="true">{{
              statusIcon(recordStatus(testRecord))
            }}</span>
            {{ label(recordStatus(testRecord)) }}
          </p>
        </details>
      </section>

      <section
        v-if="receiving && section === 'overview'"
        ref="overviewCards"
        class="overview-cards"
        aria-label="Přehled zpráv"
      >
        <article class="card overview-card">
          <div class="overview-card-title">
            <h3>Fronta zpráv</h3>
            <BaseButton
              variant="primary"
              data-detail="queue"
              @click="openDetail('queue')"
              >Zobrazit frontu</BaseButton
            >
          </div>
          <p v-if="status" class="overview-total">
            <strong>{{ status.queue.length }}</strong> / 100 zpráv ·
            {{ queueSize }} / 100 MiB
          </p>
          <p v-else class="hint">Stav fronty zatím není k dispozici.</p>
          <dl v-if="queueTotals" class="overview-metrics">
            <div>
              <dt>Čekají</dt>
              <dd>{{ queueTotals.waiting }}</dd>
            </div>
            <div>
              <dt>Odesílá se</dt>
              <dd>{{ queueTotals.active }}</dd>
            </div>
            <div>
              <dt>Pozastaveno</dt>
              <dd>{{ queueTotals.paused }}</dd>
            </div>
            <div>
              <dt>Selhalo</dt>
              <dd class="metric-danger">{{ queueTotals.failed }}</dd>
            </div>
          </dl>
        </article>
        <article class="card overview-card">
          <div class="overview-card-title">
            <h3>Historie zpráv</h3>
            <BaseButton
              variant="primary"
              data-detail="history"
              @click="openDetail('history')"
              >Zobrazit historii</BaseButton
            >
          </div>
          <p v-if="status" class="overview-total">
            <strong>{{ status.history.length }}</strong> záznamů / 100
          </p>
          <p v-else class="hint">Historie zatím není k dispozici.</p>
          <dl v-if="historyTotals" class="overview-metrics">
            <div>
              <dt>Úspěch</dt>
              <dd class="metric-success">{{ historyTotals.success }}</dd>
            </div>
            <div>
              <dt>Chyba</dt>
              <dd class="metric-danger">{{ historyTotals.danger }}</dd>
            </div>
            <div>
              <dt>Rozpracováno</dt>
              <dd>{{ historyTotals.neutral }}</dd>
            </div>
          </dl>
          <div v-if="status" class="source-summary">
            <div class="section-title">
              <h4>Poslední příjem ze zařízení</h4>
              <InlineHelp label="Jak se počítá poslední příjem">
                Z posledních 100 záznamů přijatých panelem.
              </InlineHelp>
            </div>
            <dl class="sources">
              <div v-for="source in sources" :key="source.id">
                <dt>{{ source.name }}</dt>
                <dd>
                  <time
                    v-if="source.last"
                    :datetime="new Date(source.last.receivedAt).toISOString()"
                    >{{ time(source.last.receivedAt) }}</time
                  >
                  <span v-else>{{
                    status ? "Bez záznamu" : "Stav nedostupný"
                  }}</span>
                </dd>
              </div>
            </dl>
          </div>
          <p v-if="status?.historyError" class="notice warning" role="status">
            <span aria-hidden="true">⚠ </span> Historii nelze spolehlivě
            zaznamenávat.
            {{ status.historyError }}
          </p>
        </article>
      </section>

      <div v-if="section !== 'overview'" class="detail-toolbar">
        <BaseButton variant="primary" @click="returnToOverview"
          >Zpět na přehled e-mailů</BaseButton
        >
      </div>
      <section v-if="section === 'queue'" class="card">
        <div class="section-title">
          <h3 ref="detailHeading" tabindex="-1">Fronta a opakování</h3>
          <InlineHelp label="Platnost zpráv ve frontě">
            Zprávy mají platnost 24 hodin od přijetí. Restart obsah fronty
            smaže.
          </InlineHelp>
        </div>
        <template v-if="status">
          <p v-if="!status.queue.length">Ve frontě nejsou žádné zprávy.</p>
          <template v-else>
            <label
              v-for="item in status.queue"
              :key="item.id"
              class="queue-row"
            >
              <input
                v-model="selected"
                :value="item.id"
                type="checkbox"
                :disabled="item.active || busy || !!confirmation"
              />
              <span>
                <strong>{{ item.subject || "(bez předmětu)" }}</strong>
                <span class="queue-meta hint"
                  >{{ time(item.receivedAt) }} · Pokusů:
                  {{ item.attempts }}</span
                >
              </span>
              <span class="status" :class="statusTone(queueStatus(item))">{{
                label(queueStatus(item))
              }}</span>
            </label>
            <div class="actions">
              <BaseButton
                variant="primary"
                :disabled="busy || !selected.length || !!confirmation"
                @click="act('retry', { ids: selected })"
                >Opakovat vybrané</BaseButton
              >
              <BaseButton
                variant="error"
                :disabled="busy || !selected.length || !!confirmation"
                @click="askConfirmation('delete')"
                >Odstranit vybrané</BaseButton
              >
              <BaseButton
                variant="error"
                :disabled="
                  busy ||
                  !!confirmation ||
                  !status.queue.some((item) => !item.active)
                "
                @click="askConfirmation('clear')"
                >Vyprázdnit frontu</BaseButton
              >
            </div>
            <div v-if="confirmation" class="notice warning">
              <p id="queue-confirmation" role="alert">
                {{
                  confirmation === "clear"
                    ? "Odstranit všechny zprávy kromě právě odesílané?"
                    : `Odstranit vybrané zprávy (${confirmationIds.length})?`
                }}
                Obsah odstraněných zpráv se ztratí.
              </p>
              <div class="actions">
                <BaseButton
                  variant="error"
                  :disabled="
                    busy ||
                    (confirmation === 'delete' && !confirmationIds.length)
                  "
                  aria-describedby="queue-confirmation"
                  @click="confirmAction"
                  >Potvrdit odstranění</BaseButton
                >
                <BaseButton
                  ref="cancelButton"
                  variant="primary"
                  :disabled="busy"
                  @click="cancelConfirmation"
                  >Zrušit</BaseButton
                >
              </div>
            </div>
          </template>
          <p v-if="queueMessage" class="notice" role="status">
            {{ queueMessage }}
          </p>
        </template>
      </section>

      <section v-if="section === 'history'" class="card">
        <div class="section-title">
          <h3 ref="detailHeading" tabindex="-1">
            Historie zpráv přijatých panelem
          </h3>
          <InlineHelp label="Co znamená výsledek Úspěch">
            SMTP server zprávu přijal. Výsledek nepotvrzuje doručení do
            schránky.
          </InlineHelp>
        </div>
        <p v-if="status?.historyError" class="notice warning" role="status">
          <span aria-hidden="true">⚠ </span> Historii nelze spolehlivě
          zaznamenávat.
          {{ status.historyError }}
        </p>
        <template v-if="status">
          <p v-if="!status.history.length">
            V historii zatím nejsou žádné zprávy.
          </p>
          <div v-else class="history">
            <div class="log-columns log-header" aria-hidden="true">
              <span>Předmět</span>
              <span>Zdroj</span>
              <span>Přijato panelem</span>
              <span>Výsledek</span>
            </div>
            <details
              v-for="record in status.history"
              :key="record.id"
              class="history-row"
            >
              <summary class="log-columns">
                <strong>{{ record.subject || "(bez předmětu)" }}</strong>
                <span>{{ sourceName(record.source) }}</span>
                <time :datetime="new Date(record.receivedAt).toISOString()">{{
                  time(record.receivedAt)
                }}</time>
                <span class="status" :class="resultKind(record)">
                  <span aria-hidden="true">{{
                    resultLabels[resultKind(record)].icon
                  }}</span>
                  {{ resultLabels[resultKind(record)].label }}
                </span>
              </summary>
              <div class="record-details">
                <p class="record-outcome">
                  <strong>{{ label(recordStatus(record)) }}</strong>
                </p>
                <dl class="envelope">
                  <div>
                    <dt>Odesílatel</dt>
                    <dd>{{ record.sender || "—" }}</dd>
                  </div>
                  <div>
                    <dt>Původní adresáti</dt>
                    <dd>{{ record.requestedRecipients.join(", ") || "—" }}</dd>
                  </div>
                  <div v-if="record.sourceIp">
                    <dt>IP zařízení</dt>
                    <dd>{{ record.sourceIp }}</dd>
                  </div>
                </dl>
                <div
                  v-if="Object.keys(record.recipients).length"
                  class="detail-section"
                >
                  <h4>Výsledky podle adresátů</h4>
                  <ul class="recipients">
                    <li
                      v-for="(outcome, address) in record.recipients"
                      :key="address"
                    >
                      <span>{{ address }}</span>
                      <span class="status" :class="statusTone(outcome)">{{
                        label(outcome)
                      }}</span>
                    </li>
                  </ul>
                </div>
                <div class="detail-section">
                  <h4>Události zprávy</h4>
                  <ol v-if="record.events.length" class="events">
                    <li v-for="(event, i) in record.events" :key="i">
                      <div class="event-heading">
                        <strong>{{ label(event.kind) }}</strong>
                        <time
                          class="hint"
                          :datetime="new Date(event.at).toISOString()"
                          >{{ time(event.at) }}</time
                        >
                      </div>
                      <p v-if="event.detail" class="hint">{{ event.detail }}</p>
                    </li>
                  </ol>
                  <p v-else class="hint">Bez zaznamenaných událostí.</p>
                </div>
                <p v-if="!record.contentAvailable" class="hint">
                  Obsah zprávy už není k dispozici pro další pokus.
                </p>
                <details
                  v-if="
                    record.text || record.headers || record.attachments.length
                  "
                >
                  <summary>Obsah zprávy a přílohy</summary>
                  <p class="hint">Velikost zprávy: {{ record.bytes }} bajtů</p>
                  <p v-for="(attachment, i) in record.attachments" :key="i">
                    {{ attachment.filename }} ({{ attachment.contentType }},
                    {{ attachment.size }} bajtů)
                  </p>
                  <pre v-if="record.text">{{ record.text }}</pre>
                  <pre v-if="record.headers">{{ record.headers }}</pre>
                </details>
              </div>
            </details>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { MainConfig } from "@babybox/config-schema";
  import { defaultConfig } from "@babybox/config-schema";
  import {
    computed,
    nextTick,
    onMounted,
    onUnmounted,
    ref,
    useTemplateRef,
  } from "vue";

  import { backendApi, CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
  import { getConfig } from "@/api/config";
  import {
    emailActionResultSchema,
    emailStatusSchema,
    type EmailStatus,
  } from "@/api/emailBoundary";
  import { decodeJson, requestJson } from "@/api/http";
  import { reloadBackendConfig } from "@/api/reload";
  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";
  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";
  import InlineHelp from "@/components/panel/HTMLElements/InlineHelp.vue";

  import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

  type Settings = NonNullable<MainConfig["email"]>;
  type RecordView = EmailStatus["history"][number];
  type QueueItem = EmailStatus["queue"][number];
  type EmailAction = "test" | "retry" | "delete" | "clear";
  const settings = ref<Settings>();
  type Routing = Settings["mode"] | "direct";
  const routingOptions = [
    {
      value: "direct",
      title: "Přímo ze zařízení",
      description:
        "Jednotky a kamera odesílají e-maily samy. Panel jejich zprávy nesleduje.",
    },
    {
      value: "device",
      title: "Přes panel · adresáti ze zařízení",
      description:
        "Panel zprávy odesílá na adresy určené jednotkami a kamerou.",
    },
    {
      value: "panel",
      title: "Přes panel · adresáti z panelu",
      description: "Panel zprávy odesílá na adresy nastavené zde.",
    },
  ] as const;
  const savedRouting = ref<Routing>();
  const routing = computed<Routing | undefined>(() => {
    if (!settings.value) return undefined;
    return settings.value.listener === "disabled"
      ? "direct"
      : settings.value.mode;
  });
  const receiving = computed(
    () => savedRouting.value !== undefined && savedRouting.value !== "direct",
  );

  type Detail = "queue" | "history";
  const section = ref<"overview" | Detail>("overview");
  const overviewCards = useTemplateRef("overviewCards");
  const detailHeading = useTemplateRef("detailHeading");
  const relayWorkspace = computed(
    () => routing.value !== undefined && routing.value !== "direct",
  );

  function openDetail(detail: Detail) {
    section.value = detail;
    void nextTick(() => detailHeading.value?.focus());
  }

  function returnToOverview() {
    const detail = section.value;
    resetDetail();
    void nextTick(() =>
      overviewCards.value
        ?.querySelector<HTMLElement>(`[data-detail="${detail}"]`)
        ?.focus(),
    );
  }

  function resetDetail() {
    confirmation.value = null;
    confirmationIds.value = [];
    section.value = "overview";
  }

  function selectRouting(value: Routing) {
    if (!settings.value) return;
    settings.value.listener = value === "direct" ? "disabled" : "enabled";
    if (value !== "direct") settings.value.mode = value;
    resetDetail();
    settingsMessage.value = "";
  }

  const status = ref<EmailStatus>();
  const statusUnavailable = ref(false);
  const settingsMessage = ref("");
  const testMessage = ref("");
  const queueMessage = ref("");
  const testId = ref("");
  const busy = ref(false);
  const testRecipient = ref("");
  const selected = ref<string[]>([]);
  const confirmation = ref<"delete" | "clear" | null>(null);
  const confirmationIds = ref<string[]>([]);
  const cancelButton = useTemplateRef("cancelButton");
  let confirmationTrigger: HTMLElement | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let statusRequest = 0;

  const devices = [
    { id: "engine", name: "SDS Motory" },
    { id: "thermal", name: "SDS Topení" },
    { id: "camera", name: "Kamera" },
  ];
  const sources = computed(() =>
    devices.map((device) => ({
      ...device,
      last: status.value?.history.find((record) => record.source === device.id),
    })),
  );
  const queueById = computed(
    () => new Map(status.value?.queue.map((item) => [item.id, item])),
  );
  const testRecord = computed(() =>
    status.value?.history.find((record) => record.id === testId.value),
  );
  const outboundStatus = computed(() => {
    if (!status.value) return "Stav odesílání zatím není k dispozici.";
    if (!status.value.runtimeSupported)
      return "Odesílání v této verzi není dostupné.";
    if (!status.value.configured)
      return "Doplňte SMTP server, uživatele a heslo.";
    if (status.value.error) return "Služba hlásí chybu";
    return "SMTP účet nastaven";
  });
  const sourceName = (id: string) =>
    id === "test"
      ? "Test z panelu"
      : (devices.find((device) => device.id === id)?.name ?? "Neznámý zdroj");
  const time = (value: number) => new Date(value).toLocaleString("cs-CZ");
  const labels: Record<string, string> = {
    pending: "Čeká na odeslání",
    sending: "Odesílá se",
    retrying: "Čeká na další pokus",
    accepted: "Přijato SMTP serverem",
    partial: "Přijato pro část adresátů",
    failed: "Odeslání selhalo",
    expired: "Vypršela platnost",
    evicted: "Odstraněno kvůli kapacitě",
    deleted: "Odstraněno obsluhou",
    interrupted: "Přerušeno restartem",
    temporary: "Dočasná chyba",
    permanent: "Definitivně odmítnuto",
    connection: "Chyba spojení",
    configuration: "Chyba nastavení nebo zabezpečení",
    received: "Přijato panelem",
    attempt: "Pokus o odeslání",
    restart: "Restart",
    "manual-retry": "Ruční opakování",
    "retry-scheduled": "Naplánován další pokus",
    paused: "Odesílání pozastaveno",
  };
  const label = (value: string) => labels[value] || value;
  const queueStatus = (item: QueueItem) =>
    item.active
      ? "sending"
      : item.stopped
        ? "failed"
        : item.paused
          ? "paused"
          : item.attempts
            ? "retrying"
            : "pending";

  function recordStatus(record: RecordView) {
    const item = queueById.value.get(record.id);
    if (
      record.status === "failed" &&
      Object.values(record.recipients).includes("accepted")
    )
      return "partial";
    return record.status === "pending" && item
      ? queueStatus(item)
      : record.status;
  }

  const resultLabels = {
    success: { icon: "✓", label: "Úspěch" },
    danger: { icon: "×", label: "Chyba" },
    neutral: { icon: "•", label: "Rozpracováno" },
  };

  const queueSize = computed(() =>
    ((status.value?.bytes ?? 0) / 1048576).toLocaleString("cs-CZ", {
      maximumFractionDigits: 2,
    }),
  );
  const queueTotals = computed(() => {
    if (!status.value) return undefined;
    const totals = { waiting: 0, active: 0, paused: 0, failed: 0 };
    for (const item of status.value.queue) {
      if (item.active) totals.active++;
      else if (item.stopped) totals.failed++;
      else if (item.paused) totals.paused++;
      else totals.waiting++;
    }
    return totals;
  });
  const historyTotals = computed(() => {
    if (!status.value) return undefined;
    const totals = { success: 0, danger: 0, neutral: 0 };
    for (const record of status.value.history) totals[resultKind(record)]++;
    return totals;
  });

  function resultKind(record: RecordView) {
    if (record.status === "accepted") return "success";
    if (record.status === "pending" && !queueById.value.get(record.id)?.stopped)
      return "neutral";
    return "danger";
  }

  const statusTones: Record<string, "success" | "warning" | "danger"> = {
    accepted: "success",
    partial: "warning",
    paused: "warning",
    retrying: "warning",
    temporary: "warning",
    failed: "danger",
    permanent: "danger",
    interrupted: "danger",
    expired: "danger",
    evicted: "danger",
  };
  const statusTone = (value: string) => statusTones[value] ?? "neutral";

  function statusIcon(value: string) {
    const icons = { success: "✓", warning: "!", danger: "×", neutral: "•" };
    return icons[statusTone(value)];
  }

  function askConfirmation(action: "delete" | "clear") {
    confirmationTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    confirmationIds.value = [...selected.value];
    confirmation.value = action;
    void nextTick(() => {
      const button = cancelButton.value?.$el;
      if (button instanceof HTMLElement) button.focus();
    });
  }

  function cancelConfirmation() {
    confirmation.value = null;
    confirmationIds.value = [];
    void nextTick(() => confirmationTrigger?.focus());
  }

  async function readStatus() {
    const request = ++statusRequest;
    try {
      const next = await requestJson(
        `${backendApi().baseUrl}/email`,
        emailStatusSchema,
        {
          timeout: 10000,
        },
      );
      if (request !== statusRequest || disposed) return;
      status.value = next;
      statusUnavailable.value = false;
      confirmationIds.value = confirmationIds.value.filter((id) =>
        next.queue.some((item) => item.id === id && !item.active),
      );
      selected.value = selected.value.filter((id) =>
        next.queue.some((item) => item.id === id && !item.active),
      );
    } catch {
      if (request !== statusRequest || disposed) return;
      status.value = undefined;
      statusUnavailable.value = true;
      confirmation.value = null;
      confirmationIds.value = [];
      selected.value = [];
    }
  }
  async function refresh() {
    if (receiving.value) await readStatus();
    if (!disposed) refreshTimer = setTimeout(refresh, 5000);
  }
  async function save() {
    if (busy.value || !settings.value) return;
    busy.value = true;
    try {
      const response = await fetchWithTimeout(`${CONFIGER_API_URL}/main`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.value }),
        timeout: CONFIGER_TIMEOUT,
      });
      if (!response.ok) throw new Error();
      const result = await reloadBackendConfig();
      if (result.ok) savedRouting.value = routing.value;
      settingsMessage.value = result.ok
        ? "Nastavení uloženo a načteno backendem."
        : "Nastavení uloženo. Backend ho nyní nemohl načíst; zkuste uložit znovu.";
      if (receiving.value) await readStatus();
    } catch {
      settingsMessage.value =
        "Nastavení se nepodařilo ověřit nebo uložit. Načtěte stránku znovu a ověřte uložené hodnoty.";
    } finally {
      busy.value = false;
    }
  }
  async function act(action: EmailAction, body: unknown) {
    if (busy.value) return;
    busy.value = true;
    const message = action === "test" ? testMessage : queueMessage;
    message.value = "";
    if (action === "test") testId.value = "";
    try {
      const response = await fetchWithTimeout(
        `${backendApi().baseUrl}/email/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          timeout: 20000,
        },
      );
      const result = await decodeJson(response, emailActionResultSchema);
      message.value = result.msg;
      if (response.ok) {
        if (action === "test") testId.value = result.id ?? "";
        else {
          confirmation.value = null;
          confirmationIds.value = [];
          selected.value = [];
        }
      }
      await readStatus();
    } catch {
      message.value =
        "Výsledek akce není známý. Obnovte stav a před opakováním zkontrolujte historii.";
    } finally {
      busy.value = false;
    }
  }
  async function confirmAction() {
    if (
      confirmation.value === "clear" ||
      (confirmation.value && confirmationIds.value.length)
    )
      await act(confirmation.value, {
        ids: confirmationIds.value,
        confirmed: true,
      });
  }
  onMounted(async () => {
    try {
      const parsed = await getConfig();
      if (!parsed.ok) throw new Error();
      const defaults = defaultConfig().email;
      if (!defaults) throw new Error();
      settings.value = { ...defaults, ...parsed.config.email };
      savedRouting.value = routing.value;
    } catch {
      settingsMessage.value =
        "Nastavení nelze načíst. Zkuste znovu otevřít kartu E-mail.";
    }
    if (!disposed) void refresh();
  });
  onUnmounted(() => {
    disposed = true;
    clearTimeout(refreshTimer);
  });
</script>

<style scoped lang="stylus">
  .email-workspace
    display grid
    gap 16px
    padding-bottom 80px
    color color-text-white
    color-scheme dark
    overflow-wrap anywhere

  h2, h3, h4, p
    margin 0
  h3
    font-size 1.08rem
  p, .hint, dd
    line-height 1.5
  .hint
    color #c4c7de
    font-size .9rem

  .sources, .account-fields
    display grid
    gap 12px
  .sources
    grid-template-columns repeat(3, minmax(0, 1fr))
  .account-fields
    grid-template-columns repeat(2, minmax(0, 1fr))
  .card
    border 1px solid #3b3763
    border-radius 12px
    background #100e2c
    padding 16px
    min-width 0
  .card
    display grid
    gap 10px
  .section-title
    display flex
    align-items center
    gap 8px
    h2
      font-size 1.18rem
  .source-summary
    border-top 1px solid #3b3763
    padding-top 10px
  .sources
    margin 6px 0 0
    font-size .88rem
    dd
      margin 2px 0 0
  dt
    font-weight 700
  dd
    margin 4px 0 0
    color #d4d2e8

  .status
    display inline-flex
    align-items center
    gap 6px
    width fit-content
    padding 4px 9px
    border-radius 6px
    font-size .82rem
    font-weight 700
  .neutral
    background #25224b
    color #ded9ff
  .success
    background #14382e
    color #a0f0c6
  .warning
    color #ffcd88
  .status.warning, .notice.warning
    background #3c281c
  .danger
    background #472135
    color #ffc0cb
  .notice
    padding 10px 12px
    border-radius 6px
    background #25224b
  .notice .actions
    margin-top 8px

  .history
    max-height 30rem
    overflow-y auto
    scrollbar-color #7163bd #100e2c
  .log-columns
    display grid
    grid-template-columns minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1.25fr) 136px 12px
    align-items center
    column-gap 12px
    padding 12px

  .log-header
    color #c4c7de
    font-size .78rem
    font-weight 700
    background #191638
    border-radius 6px 6px 0 0

  .history-row
    border-bottom 1px solid #3b3763
    > summary
      list-style none
      cursor pointer
      &::-webkit-details-marker
        display none
      &::after
        content ""
        justify-self center
        width 7px
        height 7px
        border solid #c4c7de
        border-width 0 2px 2px 0
        transform rotate(-45deg)
      &:hover
        background #191638
    &[open] > summary::after
      transform rotate(45deg)

  .history-row > summary .status
    white-space nowrap

  .history-row time, .event-heading time
    font-variant-numeric tabular-nums

  .record-details
    display grid
    gap 16px
    padding 16px
    background #191638
    border-radius 6px
    margin 0 0 8px

  .record-outcome span
    color #c4c7de
  .envelope
    display grid
    grid-template-columns repeat(2, minmax(0, 1fr))
    gap 10px 16px
    margin 0
  .detail-section h4
    margin 0 0 6px
  .recipients, .events
    list-style none
    margin 0
    padding 0
  .recipients li, .events li
    padding 8px 0
    border-top 1px solid #3b3763
  .event-heading, .recipients li
    display flex
    flex-wrap wrap
    align-items baseline
    justify-content space-between
    gap 6px 16px
  .record-details summary
    cursor pointer
    padding 5px 0
  pre
    white-space pre-wrap
    overflow-wrap anywhere

  .queue-row
    display grid
    grid-template-columns auto minmax(0, 1fr) auto
    align-items center
    gap 10px
    padding 8px 0
    border-top 1px solid #3b3763
  .queue-row input
    width 1rem
    height 1rem
    accent-color #8d70ff
  .queue-meta
    display block
  .actions
    display flex
    flex-wrap wrap
    gap 8px
  fieldset
    display grid
    gap 8px
    border 0
    padding 0
    margin 0 0 12px
    min-width 0
  fieldset:last-child
    margin-bottom 0
  legend
    font-weight 700
    padding 0 0 6px
  form label
    display grid
    gap 4px
    font-size .9rem
  form :deep(.base-input), form :deep(.base-select)
    width 100%
    min-width 0
    min-height 38px
    font-size 1rem
  form :deep(button)
    justify-self start
  :is(summary, input):focus-visible
    outline 2px solid #c3b6ff
    outline-offset 2px

  .overview-cards
    display grid
    grid-template-columns repeat(2, minmax(0, 1fr))
    gap 12px
  .overview-card
    align-content start
    &:focus-within
      border-color #716b95
  .overview-card:first-child .overview-metrics
    grid-template-columns repeat(4, minmax(0, 1fr))
  .overview-card-title
    display flex
    align-items center
    justify-content space-between
    flex-wrap wrap
    gap 8px
  .overview-total strong
    font-size 1.45rem
  .overview-metrics
    display grid
    grid-template-columns repeat(3, minmax(0, 1fr))
    gap 8px
    margin 0
    > div
      padding 8px 10px
      background #191638
      border-radius 6px
    dt
      color #c4c7de
      font-size .83rem
    dd
      font-size 1.1rem
      font-weight 700
    .metric-success
      color #a0f0c6
    .metric-danger
      color #ffc0cb
  .smtp-health
    display flex
    flex-wrap wrap
    align-items center
    gap 6px 14px
    font-size .9rem
    color #c4c7de
  .smtp-test
    border-top 1px solid #3b3763
    padding-top 10px
    > summary
      font-weight 700
      cursor pointer
    form
      margin-top 12px
  .routing-card
    display grid
    gap 10px
  .routing
    margin 0
    gap 10px
  .routing button
    justify-self start
  .routing-options
    display grid
    gap 10px
    grid-template-columns repeat(3, minmax(0, 1fr))
  .routing-option
    display flex
    align-items flex-start
    gap 9px
    background #191638
    border-radius 8px
    padding 12px
    cursor pointer
    span
      display block
    input
      flex none
      width 1rem
      height 1rem
      margin 3px 0 0
      accent-color #8d70ff
    &.selected
      background #25224b
    &:focus-within
      outline 2px solid #c3b6ff

  @media (max-width: 900px)
    .overview-card:first-child .overview-metrics
      grid-template-columns repeat(2, minmax(0, 1fr))

  @media (max-width: 750px)
    .routing-options
      grid-template-columns minmax(0, 1fr)
    .log-columns
      grid-template-columns minmax(0, 1fr) max-content 12px
    .log-header
      display none
    .log-columns > :is(span:nth-child(2), time)
      grid-column 1
    .log-columns > .status
      grid-area 1 / 2 / span 3
    .log-columns::after
      grid-area 1 / 3 / span 3

  @media (max-width: 650px)
    .sources, .account-fields, .overview-cards
      grid-template-columns minmax(0, 1fr)
</style>
