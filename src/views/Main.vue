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
import { defineComponent, computed, onBeforeMount, watch } from "vue";
import { useStore } from "vuex";

import Nav from "@/components/Nav.vue";
import Content from "@/components/panel/containers/Content.vue";
import Header from "@/components/panel/containers/Header.vue";
import Message from "@/components/panel/elements/Message.vue";

import { initializeStore } from "@/utils/store";
import { AppState } from "@/types/main";
import { useSounds } from "@/composables/useSounds";

export default defineComponent({
  name: "Home",
  components: {
    Nav,
    Content,
    Header,
    Message,
  },
  setup() {
    onBeforeMount(initializeStore);
    const store = useStore();
    const appState = computed((): AppState => store.state.appState);

    const soundPlayer = useSounds();

    watch(appState, (newValue, prevValue) => {
      if (
        newValue.message?.sound !== prevValue.message?.sound &&
        newValue.message?.sound != null &&
        newValue.message?.sound != undefined &&
        newValue.message?.sound != ""
      ) {
        soundPlayer.playSound(newValue.message.sound);
      }
      if (
        newValue.message == null ||
        newValue.message == undefined ||
        newValue.message.sound == null ||
        newValue.message.sound == undefined ||
        newValue.message.sound === ""
      ) {
        soundPlayer.stopSound();
      }
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
  color color

  display grid
  grid-template-columns 100%;
  grid-template-rows: min-content 1fr auto;
  grid-template-areas:
  "header"\
  "message"\
  "content"\

#MainWrapper.non-active
  background-color background
#MainWrapper.active
  animation: activeAnimBackground 3s infinite;
  animation-timing-function: ease-in-out;

  .message
    animation: activeAnimText 3s infinite;
    animation-timing-function: ease-in-out;

@keyframes activeAnimBackground {
  0% {background-color: black;}
  50% {background-color: text-error;}
  100% {background-color: black;}
}

@keyframes activeAnimText {
  0% {color: text-error;}
  30% {color: black;}
  60% {color: black;}
  100% {color: text-error;}
}
</style>
