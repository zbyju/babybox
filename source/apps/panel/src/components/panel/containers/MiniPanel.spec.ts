import { createPinia } from "pinia";
import { expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

import { useConnectionStore } from "@/pinia/connectionStore";
import { usePanelStateStore } from "@/pinia/panelStateStore";

import MiniPanel from "./MiniPanel.vue";

vi.mock("./CameraWrapper.vue", () => ({
  default: { template: '<div><slot name="overlay" /></div>' },
}));

it("shows healthy status only after both units respond and uses the live panel message", async () => {
  const pinia = createPinia();
  const connection = useConnectionStore(pinia);
  const panel = usePanelStateStore(pinia);
  const app = createApp(MiniPanel).use(pinia);
  const target = document.createElement("div");
  app.mount(target);
  try {
    expect(target.querySelector(".connection-icon.connecting")).not.toBeNull();
    expect(target.textContent).not.toContain("Vše v pořádku");
    connection.incrementSuccessEngine();
    connection.incrementSuccessThermal();
    await nextTick();
    expect(target.querySelector(".connection-icon.online")).not.toBeNull();
    expect(target.textContent).toContain("Vše v pořádku");
    connection.incrementFailEngine();
    await nextTick();
    expect(target.querySelector(".connection-icon.connecting")).not.toBeNull();
    connection.engineUnit.failStreakMs = 1_000_000;
    panel.setState({
      active: false,
      message: { text: "Chyba spojení!", color: "color-text-error" },
    });
    await nextTick();
    expect(target.querySelector(".connection-icon.offline")).not.toBeNull();
    expect(target.querySelector('[role="alert"]')?.textContent).toContain(
      "Chyba spojení!",
    );
  } finally {
    app.unmount();
  }
});
