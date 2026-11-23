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
    const config = defaultConfig();
    if (!config.email) throw new Error("Expected email defaults");
    config.email.listener = "enabled";
    vi.mocked(getConfig).mockResolvedValue(parseMainConfig(config));
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

  it("reveals and hides the password without submitting or changing it", async () => {
    const input = element.querySelector<HTMLInputElement>("#email-password");
    if (!input) throw new Error("Expected password input");
    input.value = "test password";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const button = element.querySelector<HTMLButtonElement>(
      '[aria-controls="email-password"]',
    );
    expect(input.type).toBe("password");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
    button?.click();
    await flush();
    expect(input.type).toBe("text");
    expect(input.value).toBe("test password");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    button?.click();
    await flush();
    expect(input.type).toBe("password");
    expect(input.value).toBe("test password");
    expect(vi.mocked(reloadBackendConfig)).not.toHaveBeenCalled();
  });

  it("clears the previous test result and refreshes status after a successful save", async () => {
    vi.mocked(fetchWithTimeout).mockImplementation(
      async (_url, options) =>
        new Response(
          JSON.stringify(
            options?.method === "POST" ? { msg: "Hotovo", id: "one" } : state,
          ),
        ),
    );
    const recipient = element.querySelector<HTMLInputElement>(
      '.smtp-test input[type="email"]',
    );
    if (!recipient) throw new Error("Expected test recipient input");
    recipient.value = "recipient@example.test";
    recipient.dispatchEvent(new Event("input", { bubbles: true }));
    element
      .querySelector<HTMLFormElement>(".smtp-test form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    expect(element.querySelector(".smtp-test .status")).not.toBeNull();
    const beforeSave = vi.mocked(fetchWithTimeout).mock.calls.length;
    element
      .querySelector<HTMLFormElement>(".smtp-setup > form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    expect(element.querySelector(".smtp-test .status")).toBeNull();
    expect(element.textContent).toContain(
      "Pro ověření odešlete zkušební e-mail",
    );
    const calls = vi.mocked(fetchWithTimeout).mock.calls.slice(beforeSave);
    expect(calls.some(([, options]) => options?.method === "PATCH")).toBe(true);
    expect(calls.some(([url]) => String(url).endsWith("/email"))).toBe(true);
    expect(calls.some(([, options]) => options?.method === "POST")).toBe(false);
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
      email: {
        listener: "enabled",
        mode: "device",
        host: "",
        user: "",
        password: "",
        senderOverride: "",
      },
    });
    expect(reloadBackendConfig).toHaveBeenCalledOnce();
  });

  it("shows the listener separately from the result of checking outbound SMTP", async () => {
    expect(element.querySelector(".smtp-diagnostics")?.textContent).toContain(
      "Stav neznámý",
    );
    vi.mocked(fetchWithTimeout).mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).endsWith("/check-smtp")
              ? { ok: true, msg: "Přihlášení ověřeno." }
              : state,
          ),
        ),
    );
    const button = [
      ...element.querySelectorAll(".smtp-diagnostics button"),
    ].find((item) => item.textContent?.includes("Ověřit připojení"));
    if (!(button instanceof HTMLButtonElement))
      throw new Error("Expected SMTP check button");
    button.click();
    await flush();
    expect(element.querySelector(".smtp-diagnostics")?.textContent).toContain(
      "Připojení funguje",
    );
    expect(element.querySelector(".smtp-diagnostics")?.textContent).toContain(
      state.listener,
    );
  });

  it("shows routing and summary counts first, then gives detail rows their own view", async () => {
    expect(element.querySelector(".routing-card h2")?.textContent).toContain(
      "Jak se odesílají e-maily?",
    );
    expect(
      element.querySelector(".routing-card fieldset")?.closest("details"),
    ).toBeNull();
    const cards = element.querySelectorAll(".overview-card");
    expect(cards).toHaveLength(2);
    const form = element.querySelector(".smtp-setup");
    expect(form?.nextElementSibling).toBe(
      element.querySelector(".overview-cards"),
    );
    expect(cards[0]?.textContent).toContain("Selhalo");
    expect(cards[1]?.querySelector(".sources")).not.toBeNull();
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
    expect(element.querySelector(".routing-card")).toBeNull();
    expect(element.querySelector(".smtp-setup")).toBeNull();
    await returnToOverview();
    expect(document.activeElement).toBe(
      element.querySelector('[data-detail="queue"]'),
    );
  });

  it("shows a single log row with its result and keeps diagnostics in its details", async () => {
    await openDetail("history");
    expect(element.querySelector(".routing-card")).toBeNull();
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
      email: {
        listener: "disabled",
        mode: "device",
        host: "",
        user: "",
        password: "",
        senderOverride: "",
      },
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

  it("selects direct device delivery for a default configuration", async () => {
    vi.mocked(getConfig).mockResolvedValue(parseMainConfig(defaultConfig()));
    app.unmount();
    app = createApp(EmailView);
    app.mount(element);
    await flush();

    expect(
      element.querySelector<HTMLInputElement>(
        '[name="email-routing"][value="direct"]',
      )?.checked,
    ).toBe(true);
    expect(element.querySelector(".smtp-setup")).toBeNull();
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

  it("manages unit and camera addresses separately and saves both lists in the existing format", async () => {
    const config = defaultConfig();
    if (!config.email) throw new Error("Expected email defaults");
    config.email.listener = "enabled";
    config.email.mode = "panel";
    config.email.unitRecipients = "first@example.test; second@example.test";
    config.email.cameraRecipients = "camera@example.test";
    vi.mocked(getConfig).mockResolvedValue(parseMainConfig(config));
    app.unmount();
    app = createApp(EmailView);
    app.mount(element);
    await flush();

    expect(element.querySelector(".smtp-setup .recipient-list")).toBeNull();
    const [units, camera] = element.querySelectorAll(
      ".recipient-card .recipient-list",
    );
    expect(units?.textContent).toContain("second@example.test");
    expect(camera?.textContent).toContain("camera@example.test");
    const click = (group: Element | undefined, label: string) =>
      group
        ?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        ?.click();
    const enterAddress = (group: Element | undefined, address: string) => {
      const input = group?.querySelector("input");
      if (!input) throw new Error("Expected recipient editor");
      input.value = address;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    click(units, "Upravit adresu first@example.test");
    await flush();
    enterAddress(units, "second@example.test");
    await flush();
    expect(units?.querySelector('[role="alert"]')?.textContent).toContain(
      "už je",
    );
    enterAddress(units, "updated@example.test");
    await flush();
    expect(units?.textContent).toContain("updated@example.test");
    expect(units?.textContent).not.toContain("first@example.test");

    click(camera, "Přidat adresu · Adresáti kamery");
    await flush();
    enterAddress(camera, "invalid");
    await flush();
    expect(camera?.querySelector('[role="alert"]')).not.toBeNull();
    const cameraInput = camera?.querySelector("input");
    if (!cameraInput) throw new Error("Expected camera recipient input");
    cameraInput.value = "new-camera@example.test";
    cameraInput.dispatchEvent(new Event("input", { bubbles: true }));
    [...camera.querySelectorAll(".recipient-editor button")]
      .find((button) => button.textContent?.trim() === "Přidat")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(camera?.querySelector(".recipient-rows")?.textContent).toContain(
      "new-camera@example.test",
    );
    click(camera, "Odebrat adresu camera@example.test");
    await flush();

    const writes = vi
      .mocked(fetchWithTimeout)
      .mock.calls.filter(([, options]) => options?.method === "PATCH")
      .map(([, options]) => JSON.parse(String(options?.body)));
    expect(writes).toEqual([
      { email: { unitRecipients: "updated@example.test,second@example.test" } },
      {
        email: {
          cameraRecipients: "camera@example.test,new-camera@example.test",
        },
      },
      { email: { cameraRecipients: "new-camera@example.test" } },
    ]);
    expect(reloadBackendConfig).toHaveBeenCalledTimes(3);
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
