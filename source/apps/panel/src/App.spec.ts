import { createPinia } from "pinia";
import { expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import { useAppStateStore } from "@/pinia/appStateStore";
import { usePanelStateStore } from "@/pinia/panelStateStore";
import { AppState } from "@/types/app/appState.types";

import App from "./App.vue";

const runtime = vi.hoisted(() => ({
  initializeGlobal: vi.fn(),
  startPanelLoop: vi.fn(),
  stopPanelLoop: vi.fn(),
  updateSound: vi.fn(),
  stopSound: vi.fn(),
}));

vi.mock("@/logic/panel/panelLoop", () => ({
  AppManager: class {
    initializeGlobal = runtime.initializeGlobal;
    startPanelLoop = runtime.startPanelLoop;
    stopPanelLoop = runtime.stopPanelLoop;
  },
}));
vi.mock("@/composables/useSounds", () => ({
  useSounds: () => runtime,
}));
vi.mock("./api/restart", () => ({
  refreshRestartCooldown: vi.fn().mockResolvedValue(undefined),
}));

it("keeps one monitoring and alarm lifecycle across the main panel and all settings tabs", async () => {
  const screen = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "Main", component: screen },
      { path: "/settings", name: "Settings", component: screen },
      { path: "/data", name: "Data", component: screen },
    ],
  });
  const pinia = createPinia();
  const app = createApp(App).use(pinia).use(router);
  const appState = useAppStateStore(pinia);
  const panelState = usePanelStateStore(pinia);
  await router.isReady();
  app.mount(document.createElement("div"));
  try {
    expect(runtime.startPanelLoop).not.toHaveBeenCalled();
    appState.state = AppState.Ok;
    await nextTick();
    expect(runtime.startPanelLoop).toHaveBeenCalledOnce();
    const stops = runtime.stopPanelLoop.mock.calls.length;
    await router.push({ name: "Settings", query: { tab: "email" } });
    expect(runtime.startPanelLoop).toHaveBeenCalledOnce();
    expect(runtime.stopPanelLoop).toHaveBeenCalledTimes(stops);

    const alarm = {
      text: "Alarm",
      color: "color-text-error",
      sound: "Aktivace",
    };
    panelState.setState({ active: true, message: alarm });
    await nextTick();
    expect(runtime.updateSound).toHaveBeenLastCalledWith(
      { active: true, message: alarm },
      { active: false, message: undefined },
    );

    await router.push({ name: "Settings", query: { tab: "panel" } });
    await router.push({ name: "Settings" });
    expect(runtime.startPanelLoop).toHaveBeenCalledOnce();
    expect(runtime.stopPanelLoop).toHaveBeenCalledTimes(stops);

    await router.push({ name: "Data" });
    expect(runtime.stopPanelLoop).toHaveBeenCalledTimes(stops + 1);
  } finally {
    app.unmount();
  }
});
