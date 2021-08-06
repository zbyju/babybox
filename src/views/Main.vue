<template>
  <div id="Main">
    <div id="MainWrapper" :class="active ? 'active' : 'non-active'">
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
      if (!appState.value.message) return;
      if (newValue.message?.sound !== prevValue.message?.sound) {
        soundPlayer.playSound(newValue.message.sound);
      }
    });

    return { active: appState.value.active };
  },
});
</script>

<style lang="stylus">
#MainWrapper
  padding 0

  min-height 100vh
  height 100vh
  max-height 100vh
  width calc(100vw - scrollbar-width)

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
  50% {background-color: red;}
  100% {background-color: black;}
}

@keyframes activeAnimText {
  0% {color: red;}
  30% {color: black;}
  60% {color: black;}
  100% {color: red;}
}
</style>
