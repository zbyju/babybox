import { defaultConfig, parseMainConfig } from "@babybox/config-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

import { getConfig } from "@/api/config";
import { reloadBackendConfig } from "@/api/reload";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

import EmailView from "../EmailView.vue";

vi.mock("@/api/base", () => ({
  backendApi: () => ({ baseUrl: "http://localhost:5000/api/v1" }),
  CONFIGER_API_URL: "http://localhost:5001/api/v1/config",
  CONFIGER_TIMEOUT: 10000,
}));
vi.mock("@/api/config", () => ({ getConfig: vi.fn() }));
vi.mock("@/api/reload", () => ({ reloadBackendConfig: vi.fn() }));
vi.mock("@/utils/fetchWithTimeout", () => ({ fetchWithTimeout: vi.fn() }));

describe("email maintenance page", () => {
  let element: HTMLDivElement;
  let app: ReturnType<typeof createApp>;
  const state = {
    listener: "SMTP naslouchá",
    error: null,
    historyError: null,
    configured: true,
    runtimeSupported: true,
    bytes: 1,
    queue: [
      {
        id: "one",
        subject: "Alarm",
        receivedAt: 1,
        attempts: 0,
        active: false,
        stopped: false,
        paused: false,
      },
    ],
    history: [
      {
        id: "one",
        receivedAt: 1,
        subject: "<img src=x onerror=alert(1)>",
        source: "engine",
        sender: "unit@example.com",
        bytes: 1,
        status: "pending",
        contentAvailable: true,
        requestedRecipients: [],
        recipients: {},
        attachments: [],
        text: "<script>bad()</script>",
        headers: "Subject: Alarm",
        events: [],
      },
    ],
  };
  async function flush() {
    for (let i = 0; i < 12; i++) await Promise.resolve();
    await nextTick();
  }
  async function openDetail(detail: "queue" | "history") {
    element
      .querySelector<HTMLButtonElement>(`[data-detail="${detail}"]`)
      ?.click();
    await flush();
  }

  async function returnToOverview() {
    element.querySelector<HTMLButtonElement>(".detail-toolbar button")?.click();
    await flush();
  }

  beforeEach(async () => {
    vi.mocked(getConfig).mockResolvedValue(parseMainConfig(defaultConfig()));
    vi.mocked(reloadBackendConfig).mockResolvedValue({
      ok: true,
      unapplied: [],
    });
    vi.mocked(fetchWithTimeout).mockImplementation(
      async (_url, options) =>
        new Response(
          JSON.stringify(
            options?.method === "POST" ? { changed: 1, msg: "Hotovo" } : state,
          ),
        ),
    );
    element = document.createElement("div");
    document.body.appendChild(element);
    app = createApp(EmailView);
    app.mount(element);
    await flush();
  });
  afterEach(() => {
    app.unmount();
    element.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("escapes message content and masks the SMTP password", async () => {
    await openDetail("history");
    expect(element.querySelector("script")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
    expect(element.textContent).toContain("<script>bad()</script>");
    await returnToOverview();
    expect(element.querySelector('input[type="password"]')).toBeTruthy();
  });

  it("saves only email settings so unrelated device configuration is not overwritten", async () => {
    element
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    const call = vi
      .mocked(fetchWithTimeout)
      .mock.calls.find(([, options]) => options?.method === "PATCH");
    const body = call?.[1]?.body;
    const patch: unknown =
      typeof body === "string" ? JSON.parse(body) : undefined;
    expect(patch).toEqual({
      email: defaultConfig().email,
    });
    expect(reloadBackendConfig).toHaveBeenCalledOnce();
  });

  it("shows routing and summary counts first, then gives detail rows their own view", async () => {
    expect(
      element.querySelector(".routing-card legend")?.textContent,
    ).toContain("Jak se odesílají e-maily?");
    expect(element.querySelector(".routing-card summary")).toBeNull();
    const cards = element.querySelectorAll(".overview-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]?.querySelector(".overview-total strong")?.textContent).toBe(
      "1",
    );
    expect(cards[1]?.querySelector(".overview-total strong")?.textContent).toBe(
      "1",
    );
    expect(element.querySelector(".queue-row")).toBeNull();
    await openDetail("queue");
    expect(document.activeElement?.textContent).toContain("Fronta a opakování");
    expect(element.querySelector(".overview-cards")).toBeNull();
    expect(element.querySelector(".queue-row")).not.toBeNull();
    await returnToOverview();
    expect(document.activeElement).toBe(
      element.querySelector('[data-detail="queue"]'),
    );
  });

  it("shows a single log row with its result and keeps diagnostics in its details", async () => {
    await openDetail("history");
    const rows = element.querySelectorAll(".history-row");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.querySelector("summary")?.textContent).toContain(
      "Rozpracováno",
    );
    expect(row?.querySelector("summary")?.textContent).not.toContain(
      "unit@example.com",
    );
    expect(row?.querySelector(".record-details")?.textContent).toContain(
      "unit@example.com",
    );
    expect(row?.querySelector(".record-details")?.textContent).toContain(
      "Události zprávy",
    );
  });

  it("hides panel-only tools when devices send directly without deleting mail", async () => {
    const routing = element.querySelector<HTMLInputElement>(
      '[name="email-routing"][value="direct"]',
    );
    routing?.click();
    await flush();
    expect(element.querySelector('input[type="password"]')).toBeNull();
    expect(element.querySelector(".overview-cards")).toBeNull();

    element.querySelector<HTMLButtonElement>(".routing-card button")?.click();
    await flush();
    const call = vi
      .mocked(fetchWithTimeout)
      .mock.calls.find(([, options]) => options?.method === "PATCH");
    const body = call?.[1]?.body;
    const patch: unknown =
      typeof body === "string" ? JSON.parse(body) : undefined;
    expect(patch).toEqual({
      email: { ...defaultConfig().email, listener: "disabled" },
    });
    expect(element.querySelector('input[type="email"]')).toBeNull();
    expect(element.querySelector(".history-row")).toBeNull();
    expect(element.querySelector(".queue-row")).toBeNull();
    expect(element.querySelector(".overview-cards")).toBeNull();
    const posts = vi
      .mocked(fetchWithTimeout)
      .mock.calls.filter(([, options]) => options?.method === "POST");
    expect(posts).toHaveLength(0);
  });

  it("shows panel recipient fields only when the panel selects recipients", async () => {
    expect(element.textContent).not.toContain("Adresáti jednotek");
    expect(element.querySelector('input[type="password"]')).not.toBeNull();
    const routing = element.querySelector<HTMLInputElement>(
      '[name="email-routing"][value="panel"]',
    );
    routing?.click();
    await flush();
    expect(element.textContent).toContain("Adresáti jednotek");
    expect(element.textContent).toContain("Adresáti kamery");
  });

  it("requires an inline confirmation before deleting and never opens a blocking dialog", async () => {
    await openDetail("queue");
    const confirm = vi.spyOn(window, "confirm");
    const button = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Vyprázdnit frontu"),
    );
    expect(button).toBeDefined();
    button?.click();
    await flush();
    expect(
      vi
        .mocked(fetchWithTimeout)
        .mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
    const confirmButton = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Potvrdit odstranění"),
    );
    expect(confirmButton).toBeDefined();
    confirmButton?.click();
    await flush();
    const call = vi
      .mocked(fetchWithTimeout)
      .mock.calls.find(([url]) => String(url).endsWith("/email/clear"));
    const body = call?.[1]?.body;
    const action: unknown =
      typeof body === "string" ? JSON.parse(body) : undefined;
    expect(action).toMatchObject({ confirmed: true });
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
