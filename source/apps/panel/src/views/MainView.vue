<template>
  <div id="Main">
    <div id="MainWrapper" :class="panelState.active ? 'active' : 'non-active'">
      <TheHeader />
      <HighlightMessage />
      <TheContent />
    </div>
    <TheNav />
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed, onBeforeMount, onBeforeUnmount, watch } from "vue";

  import TheContent from "@/components/panel/containers/TheContent.vue";
  import TheHeader from "@/components/panel/containers/TheHeader.vue";
  import HighlightMessage from "@/components/panel/elements/HighlightMessage.vue";
  import TheNav from "@/components/TheNav.vue";
  import { useSounds } from "@/composables/useSounds";
  import { AppManager } from "@/logic/panel/panelLoop";
  import { usePanelStateStore } from "@/pinia/panelStateStore";
  import type { PanelState } from "@/types/panel/main.types";

  document.body.scrollTop = document.documentElement.scrollTop = 0;

  const panelStateStore = usePanelStateStore();
  const { message, active } = storeToRefs(panelStateStore);
  const panelState = computed(
    (): PanelState => ({
      message: message.value,
      active: active.value,
    }),
  );
  // Sounds
  const soundPlayer = useSounds();
  watch(panelState, (newValue, prevValue) =>
    soundPlayer.updateSound(newValue, prevValue),
  );
  // App loop
  const appManager = new AppManager();
  onBeforeMount(() => appManager.startPanelLoop());
  onBeforeUnmount(() => {
    appManager.stopPanelLoop();
    soundPlayer.stopSound();
  });
</script>

<style lang="stylus">
  #MainWrapper
    padding 0

    min-height 100vh
    height 100vh
    max-height 100vh
    width 100vw

    overflow hidden
    color color-text-white

    display grid
    grid-template-columns 100%;
    grid-template-rows: min-content 1fr auto;
    grid-template-areas:
    "header"\
    "message"\
    "content"\

  #MainWrapper.non-active
    background-color color-bg-black
  #MainWrapper.active
    background-color color-bg-active
    animation: activeAnimBackground 3s infinite;
    animation-timing-function: ease-in-out;

    .message
      animation: activeAnimText 3s infinite;
      animation-timing-function: ease-in-out;

  @keyframes activeAnimBackground {
    0% {background-color: black;}
    50% {background-color: color-bg-active;}
    100% {background-color: black;}
  }

  @keyframes activeAnimText {
    0% {color: color-bg-active;}
    30% {color: black;}
    60% {color: black;}
    100% {color: color-bg-active;}
  }
</style>
