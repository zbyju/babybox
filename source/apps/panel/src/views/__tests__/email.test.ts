import { defaultConfig } from "@babybox/config-schema";
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
vi.mock("@/components/TheNav.vue", () => ({ default: { render: () => null } }));
vi.mock("@/router", () => ({ default: { push: vi.fn() } }));

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
  beforeEach(async () => {
    vi.mocked(getConfig).mockResolvedValue(defaultConfig());
    vi.mocked(reloadBackendConfig).mockResolvedValue({
      ok: true,
      unapplied: [],
    });
    vi.mocked(fetchWithTimeout).mockImplementation(
      async (_url, options) =>
        ({
          ok: true,
          json: async () =>
            options?.method === "POST" ? { changed: 1, msg: "Hotovo" } : state,
        } as Response),
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

  it("escapes message content and masks the SMTP password", () => {
    expect(element.querySelector("script")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
    expect(element.textContent).toContain("<script>bad()</script>");
    expect(element.querySelector('input[type="password"]')).toBeTruthy();
  });

  it("saves only email settings so unrelated device configuration is not overwritten", async () => {
    element
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    const call = vi
      .mocked(fetchWithTimeout)
      .mock.calls.find(([, options]) => options?.method === "PATCH")!;
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      email: defaultConfig().email,
    });
    expect(reloadBackendConfig).toHaveBeenCalledOnce();
  });

  it("requires an inline confirmation before deleting and never opens a blocking dialog", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const button = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Vyprázdnit frontu"),
    )!;
    button.click();
    await flush();
    expect(
      vi
        .mocked(fetchWithTimeout)
        .mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
    const confirmButton = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Potvrdit odstranění"),
    )!;
    confirmButton.click();
    await flush();
    const call = vi
      .mocked(fetchWithTimeout)
      .mock.calls.find(([url]) => String(url).endsWith("/email/clear"))!;
    expect(JSON.parse(String(call[1]?.body)).confirmed).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
