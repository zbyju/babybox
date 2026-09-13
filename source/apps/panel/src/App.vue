<template>
  <AppState>
    <router-view></router-view>
    <FloatingActions v-if="showFloatingActions" />
  </AppState>
</template>

<script lang="ts" setup>
  import { computed, onBeforeMount, onUnmounted } from "vue";
  import { useRoute } from "vue-router";

  import { AppManager } from "@/logic/panel/panelLoop";

  import { refreshRestartCooldown } from "./api/restart";
  import AppState from "./components/AppState.vue";
  import FloatingActions from "./components/FloatingActions.vue";

  const route = useRoute();
  /* The panel is one screen. Settings and config are long pages. */
  const showFloatingActions = computed(() => route.name !== "Main");

  const appManager = new AppManager();
  onBeforeMount(async () => await appManager.initializeGlobal());

  const RESTART_COOLDOWN_DELAY = 5000;
  let restartCooldownTimer: ReturnType<typeof setTimeout> | undefined;

  /*
   * The backend reboots the PC when these stop arriving,
   * so the next one waits for the current one to settle.
   * Overlapping calls would queue in the browser and time out on their own.
   */
  const refreshRestartCooldownLoop = async () => {
    try {
      await refreshRestartCooldown();
    } catch (err) {
      console.log(err);
    }
    restartCooldownTimer = setTimeout(
      refreshRestartCooldownLoop,
      RESTART_COOLDOWN_DELAY,
    );
  };

  refreshRestartCooldownLoop();
  onUnmounted(() => clearTimeout(restartCooldownTimer));
</script>

<style lang="stylus">
  // CSS
  #app, button, input, select
    font-family "Open Sans", Avenir, Helvetica, Arial, sans-serif
    -webkit-font-smoothing antialiased
    -moz-osx-font-smoothing grayscale

  .time-font
    font-family Impact, Avenir, Helvetica, Arial, sans-serif
    font-weight 800

  html, body
    padding 0
    margin 0
    min-width 100vw
    max-width 100vw
    width 100vw
    overflow-x hidden
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;


  .w-300
    font-weight 300

  .w-400
    font-weight 400

  .w-600
    font-weight 600

  .w-700
    font-weight 700

  .w-800
    font-weight 800

  .fs-italic
    font-style italic

  .fs-normal
    font-style normal
</style>
