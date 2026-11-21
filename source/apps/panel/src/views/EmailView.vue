<template>
  <div class="email-workspace">
    <header class="email-heading">
      <div>
        <h2>Provoz e-mailů</h2>
        <p>Příjem zpráv z jednotek a kamery a jejich předání SMTP serveru.</p>
      </div>
      <span
        class="status"
        :class="
          status && !status.error && status.runtimeSupported
            ? 'neutral'
            : 'warning'
        "
      >
        <span aria-hidden="true">●</span>
        {{
          status
            ? receiving
              ? "Živý přehled"
              : "Příjem vypnutý"
            : statusUnavailable
              ? "Stav nedostupný"
              : "Načítání stavu"
        }}
      </span>
    </header>

    <p v-if="statusUnavailable" class="notice warning" role="status">
      Stav e-mailové služby nelze načíst. Panel se znovu pokusí o spojení.
    </p>

    <section
      v-if="receiving"
      class="service-grid"
      aria-label="Stav e-mailové služby"
    >
      <div class="tile">
        <h3>Příjem zpráv</h3>
        <p>{{ status?.listener || "Stav příjmu zatím není k dispozici." }}</p>
      </div>
      <div class="tile">
        <h3>Odchozí SMTP</h3>
        <p :class="status?.error ? 'warning' : undefined">
          <span v-if="status?.error" aria-hidden="true">⚠ </span>
          {{ outboundStatus }}
        </p>
        <p v-if="status?.error" class="diagnostic">{{ status.error }}</p>
      </div>
      <div class="tile">
        <h3>Fronta zpráv</h3>
        <p v-if="status">
          <strong>{{ status.queue.length }} / 100</strong> zpráv ·
          {{
            (status.bytes / 1048576).toLocaleString("cs-CZ", {
              maximumFractionDigits: 2,
            })
          }}
          / 100 MiB
        </p>
        <p v-else>Stav fronty zatím není k dispozici.</p>
      </div>
    </section>
    <p v-if="status?.historyError" class="notice warning" role="status">
      <span aria-hidden="true">⚠ </span> Historii nelze spolehlivě zaznamenávat.
      {{ status.historyError }}
    </p>

    <div class="work-grid">
      <div
        v-if="receiving || status?.history.length || status?.queue.length"
        class="column"
      >
        <section v-if="receiving" class="card">
          <h3>Poslední příjem ze zařízení</h3>
          <p class="hint">Podle posledních 100 záznamů v historii panelu.</p>
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
        </section>

        <section v-if="status" class="card">
          <h3>Historie zpráv</h3>
          <p class="hint">
            Úspěch znamená přijetí SMTP serverem. Doručení do schránky tím není
            potvrzeno.
          </p>
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
        </section>

        <section
          v-if="status && (receiving || status.queue.length)"
          class="card"
        >
          <h3>Fronta a opakování</h3>
          <p class="hint">
            Zprávy ve frontě mají platnost 24 hodin od přijetí. Restart obsah
            fronty smaže.
          </p>
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
        </section>
      </div>

      <div class="column">
        <section class="card">
          <h3>Nastavení e-mailu</h3>
          <p class="hint">
            Tato nastavení platí pro zprávy přijaté panelem. Cíl odesílání
            nastavuje technik přímo na jednotkách a kameře.
          </p>
          <form v-if="settings" @submit.prevent="save">
            <label class="receive-toggle">
              <span>
                <strong>Příjem e-mailů do panelu</strong>
                <span class="hint"
                  >Nové zprávy z jednotek a kamery na portu 25</span
                >
              </span>
              <input
                v-model="settings.listener"
                type="checkbox"
                role="switch"
                true-value="enabled"
                false-value="disabled"
                :disabled="busy"
              />
            </label>
            <p v-if="settings.listener === 'disabled'" class="hint off-note">
              {{
                receiving
                  ? "Po uložení panel přestane přijímat nové zprávy."
                  : "Panel má vypnutý příjem nových zpráv."
              }}
              Zprávy ve frontě se dál zpracovávají a historie zůstává dostupná.
            </p>
            <fieldset v-if="settings.listener === 'enabled'" :disabled="busy">
              <legend>Adresáti</legend>
              <label
                >Zdroj adresátů
                <BaseSelect
                  :model-value="settings.mode"
                  :options="['device', 'panel']"
                  :option-labels="{
                    device: 'Jednotky a kamera',
                    panel: 'Panel Babybox',
                  }"
                  @update:model-value="
                    settings.mode = $event === 'panel' ? 'panel' : 'device'
                  "
                />
              </label>
              <p class="hint">
                {{
                  settings.mode === "device"
                    ? "Panel použije adresáty z příchozí zprávy."
                    : "Panel použije níže uvedené adresáty. Více adres oddělte čárkou."
                }}
              </p>
              <template v-if="settings.mode === 'panel'">
                <label
                  >Adresáti jednotek
                  <BaseInput
                    v-model="settings.unitRecipients"
                    type="text"
                    maxlength="8000"
                  />
                </label>
                <label
                  >Adresáti kamery
                  <BaseInput
                    v-model="settings.cameraRecipients"
                    type="text"
                    maxlength="8000"
                  />
                </label>
              </template>
            </fieldset>
            <fieldset v-if="settings.listener === 'enabled'" :disabled="busy">
              <legend>Odchozí účet</legend>
              <label
                >SMTP server (TLS, port 465)
                <BaseInput
                  v-model="settings.host"
                  type="text"
                  maxlength="253"
                  autocomplete="off"
                />
              </label>
              <div class="account-fields">
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
              </div>
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
          <p v-else-if="!settings" role="status">Načítání nastavení…</p>
        </section>

        <section v-if="receiving" class="card">
          <h3>Test odesílání</h3>
          <p class="hint">
            Test použije uložený SMTP účet a odešle zprávu na jedinou zadanou
            adresu.
          </p>
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
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { MainConfig } from "@babybox/config-schema";
  import { defaultConfig, parseMainConfig } from "@babybox/config-schema";
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
  import { reloadBackendConfig } from "@/api/reload";
  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";
  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";
  import BaseSelect from "@/components/panel/HTMLElements/BaseSelect.vue";

  import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

  type Settings = NonNullable<MainConfig["email"]>;
  interface RecordView {
    id: string;
    receivedAt: number;
    subject: string;
    source: string;
    sourceIp?: string;
    sender: string;
    bytes: number;
    status: string;
    contentAvailable: boolean;
    requestedRecipients: string[];
    recipients: Record<string, string>;
    text: string;
    headers: string;
    attachments: { filename: string; contentType: string; size: number }[];
    events: { at: number; kind: string; detail: string }[];
  }
  interface Status {
    listener: string;
    error: string | null;
    historyError: string | null;
    configured: boolean;
    runtimeSupported: boolean;
    bytes: number;
    queue: {
      id: string;
      subject: string;
      receivedAt: number;
      attempts: number;
      active: boolean;
      stopped: boolean;
      paused: boolean;
    }[];
    history: RecordView[];
  }
  type QueueItem = Status["queue"][number];
  type EmailAction = "test" | "retry" | "delete" | "clear";
  const settings = ref<Settings>();
  const savedListener = ref<Settings["listener"]>();
  const receiving = computed(() => savedListener.value !== "disabled");

  const status = ref<Status>();
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
    return "Účet nastaven · výsledek ověříte testem";
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

  function resultKind(record: RecordView) {
    if (record.status === "accepted") return "success";
    if (record.status === "pending" && !queueById.value.get(record.id)?.stopped)
      return "neutral";
    return "danger";
  }

  function statusTone(value: string) {
    switch (value) {
      case "accepted":
        return "success";
      case "partial":
      case "paused":
      case "retrying":
      case "temporary":
        return "warning";
      case "failed":
      case "permanent":
      case "interrupted":
      case "expired":
      case "evicted":
        return "danger";
      default:
        return "neutral";
    }
  }

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
      const response = await fetchWithTimeout(`${backendApi().baseUrl}/email`, {
        timeout: 10000,
      });
      if (!response.ok) throw new Error();
      const next: Status = await response.json();
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
    await readStatus();
    if (!disposed) refreshTimer = setTimeout(refresh, 5000);
  }
  async function save() {
    if (busy.value) return;
    busy.value = true;
    try {
      const response = await fetchWithTimeout(`${CONFIGER_API_URL}/main`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.value }),
        timeout: CONFIGER_TIMEOUT,
      });
      if (!response.ok) throw new Error();
      savedListener.value = settings.value?.listener;
      const result = await reloadBackendConfig();
      settingsMessage.value = result.ok
        ? "Nastavení uloženo a načteno backendem."
        : "Nastavení uloženo. Backend ho nyní nemohl načíst; zkuste uložit znovu.";
      await readStatus();
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
      const result = await response.json();
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
    void refresh();
    try {
      const parsed = parseMainConfig(await getConfig());
      if (!parsed.ok) throw new Error();
      const defaults = defaultConfig().email;
      if (!defaults) throw new Error();
      settings.value = { ...defaults, ...parsed.config.email };
      savedListener.value = settings.value.listener;
    } catch {
      settingsMessage.value =
        "Nastavení nelze načíst. Zkuste znovu otevřít kartu E-mail.";
    }
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

  .email-heading
    display flex
    align-items center
    justify-content space-between
    gap 12px

  h2, h3, p
    margin 0
  h2
    font-size 1.65rem
  h3
    font-size 1.08rem
  p, .hint, dd
    line-height 1.5
  .email-heading p, .hint
    color #c4c7de
    font-size .9rem
  .email-heading p
    margin-top 4px

  .service-grid, .sources, .work-grid, .account-fields
    display grid
    gap 12px
  .service-grid, .sources
    grid-template-columns repeat(3, minmax(0, 1fr))
  .work-grid
    grid-template-columns minmax(0, 3fr) minmax(0, 2fr)
    gap 16px
  .account-fields
    grid-template-columns repeat(2, minmax(0, 1fr))
  .column
    display grid
    gap 16px
    align-content start
    min-width 0

  .tile, .card
    border 1px solid #3b3763
    border-radius 12px
    background #100e2c
    padding 16px
    min-width 0
  .card
    display grid
    gap 10px
  .tile h3
    margin-bottom 8px
    color #c4c7de
  .diagnostic
    margin-top 4px
    color #ffcd88
    font-size .9rem

  .sources
    margin 2px 0 0
  .sources > div
    padding 10px 12px
    background #191638
    border-radius 4px
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
    grid-template-columns minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1.25fr) 118px 12px
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

  form .receive-toggle
    display flex
    align-items center
    justify-content space-between
    gap 12px
    padding 12px
    background #191638
    border-radius 8px
    margin-bottom 14px
    cursor pointer
    .hint
      display block
    input
      appearance none
      box-sizing border-box
      flex none
      width 44px
      height 25px
      margin 0
      padding 3px
      border-radius 20px
      border-color #8e86b6
      background #282445
      cursor pointer
      &::after
        content ""
        display block
        width 17px
        height 17px
        border-radius 50%
        background white
      &:checked
        background #6543bd
        &::after
          margin-inline-start 18px
      &:disabled
        cursor not-allowed
        opacity .65
  .off-note
    margin-bottom 12px

  @media (forced-colors: active)
    form .receive-toggle input
      appearance auto
      &::after
        display none

  @media (max-width: 750px)
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

  @media (max-width: 1050px)
    .work-grid
      grid-template-columns minmax(0, 1fr)

  @media (max-width: 650px)
    .service-grid, .sources, .account-fields
      grid-template-columns minmax(0, 1fr)
</style>
