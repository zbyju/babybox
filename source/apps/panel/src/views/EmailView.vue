<template>
  <div id="Email">
    <TheNav />
    <main>
      <h1>E-mail</h1>
      <p>
        Sledování a místní alarmy zůstávají aktivní. Nastavení této stránky
        nepřesměruje e-maily z jednotek ani kamery.
      </p>
      <p role="status">{{ message }}</p>
      <p v-if="statusUnavailable" role="status" class="failure">
        Stav e-mailové služby nelze načíst. Čeká se na obnovení spojení.
      </p>
      <section v-if="status">
        <h2>Stav služby</h2>
        <p>{{ status.listener }}</p>
        <p v-if="status.error" class="failure">{{ status.error }}</p>
        <p v-if="status.historyError" class="failure">
          {{ status.historyError }}
        </p>
        <p>
          {{
            status.configured
              ? "Odchozí účet je vyplněn."
              : "Vyplňte odchozí SMTP účet. Přijaté zprávy čekají v omezené frontě."
          }}
        </p>
        <p>
          Fronta: {{ status.queue.length }} / 100 zpráv,
          {{ (status.bytes / 1048576).toFixed(2) }} / 100 MiB. Platnost: 24
          hodin od přijetí.
        </p>
        <p>
          Přijetí SMTP poskytovatelem nepotvrzuje doručení do schránky. Obsah
          fronty se při restartu ztratí; diagnostická historie zůstává.
        </p>
      </section>
      <form v-if="settings" @submit.prevent="save">
        <h2>Nastavení</h2>
        <label
          >Příjem SMTP na portu 25
          <select v-model="settings.listener">
            <option value="enabled">Zapnutý</option>
            <option value="disabled">Vypnutý</option>
          </select>
        </label>
        <label
          >Adresáti
          <select v-model="settings.mode">
            <option value="device">Použít nastavení zařízení</option>
            <option value="panel">Použít nastavení panelu</option>
          </select>
        </label>
        <label
          >Odchozí SMTP server (TLS, port 465)<input
            v-model="settings.host"
            maxlength="253"
            autocomplete="off"
        /></label>
        <label
          >SMTP uživatel<input
            v-model="settings.user"
            maxlength="1000"
            autocomplete="off"
        /></label>
        <label
          >SMTP heslo<input
            v-model="settings.password"
            type="password"
            maxlength="1000"
            autocomplete="new-password"
        /></label>
        <label
          >Náhradní odesílatel (volitelný)<input
            v-model="settings.senderOverride"
            maxlength="320"
        /></label>
        <label
          >Adresáti jednotek (oddělit čárkou)<input
            v-model="settings.unitRecipients"
            maxlength="8000"
        /></label>
        <label
          >Adresáti kamery (oddělit čárkou)<input
            v-model="settings.cameraRecipients"
            maxlength="8000"
        /></label>
        <button :disabled="busy">Uložit nastavení</button>
      </form>
      <section>
        <h2>Testovací zpráva</h2>
        <p>
          Test odešle zprávu pouze na zde zadanou adresu. Odesílatel je náhradní
          adresa nebo SMTP uživatel.
        </p>
        <form @submit.prevent="act('test', { recipient: testRecipient })">
          <label
            >Adresa pro test<input
              v-model="testRecipient"
              type="email"
              required
          /></label>
          <button :disabled="busy || !status?.runtimeSupported">
            Zařadit test do fronty
          </button>
        </form>
      </section>
      <section v-if="status">
        <h2>Fronta</h2>
        <p v-if="!status.queue.length">Ve frontě nejsou žádné zprávy.</p>
        <label v-for="item in status.queue" :key="item.id" class="queue-row">
          <input
            v-model="selected"
            :value="item.id"
            type="checkbox"
            :disabled="item.active"
          />
          {{ item.subject || "(bez předmětu)" }} · {{ time(item.receivedAt) }} ·
          {{
            item.active
              ? "odesílání"
              : item.stopped
                ? "definitivní chyba; čeká na obsluhu"
                : item.paused
                  ? "odesílání pozastaveno"
                  : "čeká"
          }}
          · pokusů {{ item.attempts }}
        </label>
        <button
          :disabled="busy || !selected.length"
          @click="act('retry', { ids: selected })"
        >
          Opakovat vybrané nedokončené adresáty
        </button>
        <button
          :disabled="busy || !selected.length"
          @click="confirmation = 'delete'"
        >
          Odstranit vybrané
        </button>
        <button
          :disabled="busy || !status.queue.some((item) => !item.active)"
          @click="confirmation = 'clear'"
        >
          Vyprázdnit frontu
        </button>
        <div v-if="confirmation" role="alert">
          <p>
            Odstranit
            {{
              confirmation === "clear"
                ? "všechny čekající zprávy"
                : "vybrané zprávy"
            }}? Obsah bude nenávratně ztracen. Aktivní odesílání se dokončí.
          </p>
          <button :disabled="busy" @click="confirmAction">
            Potvrdit odstranění
          </button>
          <button @click="confirmation = null">Zrušit</button>
        </div>
      </section>
      <section v-if="status">
        <h2>Posledních 100 e-mailů</h2>
        <details v-for="record in status.history" :key="record.id">
          <summary>
            {{ time(record.receivedAt) }} ·
            {{ record.subject || "(bez předmětu)" }} ·
            {{ label(record.status) }}
          </summary>
          <p>
            Zdroj: {{ record.source }} {{ record.sourceIp || "" }} · Odesílatel:
            {{ record.sender }} · {{ record.bytes }} bajtů
          </p>
          <p>Původní adresáti: {{ record.requestedRecipients.join(", ") }}</p>
          <p v-for="(outcome, address) in record.recipients" :key="address">
            {{ address }}: {{ label(outcome) }}
          </p>
          <p v-if="!record.contentAvailable">
            Obsah není k dispozici pro opakování.
          </p>
          <p v-for="(attachment, i) in record.attachments" :key="i">
            Příloha: {{ attachment.filename }} ({{ attachment.contentType }},
            {{ attachment.size }} bajtů)
          </p>
          <pre>{{ record.text }}</pre>
          <details>
            <summary>Hlavičky</summary>
            <pre>{{ record.headers }}</pre>
          </details>
          <ol>
            <li v-for="(event, i) in record.events" :key="i">
              {{ time(event.at) }} · {{ label(event.kind) }} ·
              {{ event.detail }}
            </li>
          </ol>
        </details>
      </section>
    </main>
  </div>
</template>

<script lang="ts" setup>
  import type { MainConfig } from "@babybox/config-schema";
  import { defaultConfig, parseMainConfig } from "@babybox/config-schema";
  import { onMounted, onUnmounted, ref } from "vue";

  import { backendApi, CONFIGER_API_URL, CONFIGER_TIMEOUT } from "@/api/base";
  import { getConfig } from "@/api/config";
  import { reloadBackendConfig } from "@/api/reload";
  import TheNav from "@/components/TheNav.vue";
  import router from "@/router";
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
  const settings = ref<Settings>();
  const status = ref<Status>();
  const statusUnavailable = ref(false);
  const message = ref("");
  const busy = ref(false);
  const testRecipient = ref("");
  const selected = ref<string[]>([]);
  const confirmation = ref<"delete" | "clear" | null>(null);
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let returnTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let statusRequest = 0;
  const time = (value: number) => new Date(value).toLocaleString("cs-CZ");
  const labels: Record<string, string> = {
    pending: "čeká",
    accepted: "přijato SMTP poskytovatelem",
    failed: "selhalo",
    expired: "vypršela platnost",
    evicted: "odstraněno kvůli kapacitě",
    deleted: "odstraněno obsluhou",
    interrupted: "přerušeno restartem",
    temporary: "dočasná chyba",
    permanent: "definitivní odmítnutí",
    connection: "chyba spojení",
    configuration: "chyba nastavení nebo zabezpečení",
    received: "přijato panelem",
    attempt: "pokus",
    restart: "restart",
    "manual-retry": "ruční opakování",
    "retry-scheduled": "naplánováno opakování",
    paused: "odesílání pozastaveno",
  };
  const label = (value: string) => labels[value] || value;
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
      selected.value = selected.value.filter((id) =>
        next.queue.some((item) => item.id === id && !item.active),
      );
    } catch {
      if (request !== statusRequest || disposed) return;
      status.value = undefined;
      statusUnavailable.value = true;
      confirmation.value = null;
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
      const result = await reloadBackendConfig();
      message.value = result.ok
        ? "Nastavení uloženo a načteno backendem."
        : "Nastavení uloženo. Backend ho nyní nemohl načíst; zkuste uložit znovu.";
      await readStatus();
    } catch {
      message.value =
        "Nastavení se nepodařilo ověřit nebo uložit. Načtěte stránku znovu a ověřte uložené hodnoty.";
    } finally {
      busy.value = false;
    }
  }
  async function act(action: string, body: unknown) {
    if (busy.value) return;
    busy.value = true;
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
        confirmation.value = null;
        selected.value = [];
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
    if (confirmation.value)
      await act(confirmation.value, { ids: selected.value, confirmed: true });
  }
  onMounted(async () => {
    returnTimer = setTimeout(() => router.push("/"), 10 * 60 * 1000);
    try {
      const parsed = parseMainConfig(await getConfig());
      if (!parsed.ok) throw new Error();
      const defaults = defaultConfig().email;
      if (!defaults) throw new Error();
      settings.value = { ...defaults, ...parsed.config.email };
    } catch {
      message.value = "Nastavení nelze načíst.";
    }
    if (!disposed) void refresh();
  });
  onUnmounted(() => {
    disposed = true;
    clearTimeout(refreshTimer);
    clearTimeout(returnTimer);
  });
</script>

<style scoped>
  #Email {
    min-height: 100vh;
    background: #010017;
    color: #eee;
  }
  main {
    padding: 24px;
    max-width: 1100px;
    margin: auto;
  }
  section,
  form {
    padding: 16px 0;
    border-bottom: 1px solid #4a426a;
  }
  label {
    display: grid;
    gap: 6px;
    margin: 12px 0;
  }
  input,
  select,
  button {
    font: inherit;
    padding: 8px;
  }
  input,
  select {
    background: #201b35;
    color: white;
    border: 1px solid #777;
  }
  button {
    margin: 6px;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .queue-row {
    display: flex;
    align-items: center;
  }
  .failure {
    color: #ffad83;
  }
  details {
    margin: 12px 0;
  }
  summary {
    cursor: pointer;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
