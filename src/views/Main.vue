<template>
  <div id="Main">
    <div id="MainWrapper" :class="appState.active ? 'active' : 'non-active'">
      <Header></Header>
      <Message></Message>
      <Content></Content>
    </div>
    <Nav></Nav>
  </div>
</template>

<script lang="ts">
import Nav from "@/components/Nav.vue";
import Content from "@/components/panel/containers/Content.vue";
import Header from "@/components/panel/containers/Header.vue";
import Message from "@/components/panel/elements/Message.vue";
import { useSounds } from "@/composables/useSounds";
import { useAppStateStore } from "@/pinia/appStateStore";
import type { AppState } from "@/types/panel/main";
import { AppManager } from "@/utils/store";
import { storeToRefs } from "pinia";
import {
  computed,
  defineComponent,
  onBeforeMount,
  onBeforeUnmount,
  watch,
} from "vue";

export default defineComponent({
  name: "Home",
  components: {
    Nav,
    Content,
    Header,
    Message,
  },
  setup() {
    const appStateStore = useAppStateStore();
    const { message, active } = storeToRefs(appStateStore);
    const appState = computed(
      (): AppState => ({
        message: message.value,
        active: active.value,
      })
    );
    // Sounds
    const soundPlayer = useSounds();
    watch(appState, (newValue, prevValue) =>
      soundPlayer.updateSound(newValue, prevValue)
    );
    // App loop
    const appManager = new AppManager();
    onBeforeMount(() => appManager.startPanelLoop());
    onBeforeUnmount(() => {
      appManager.stopPanelLoop();
      soundPlayer.stopSound();
    });

    return { appState: appState };
  },
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
