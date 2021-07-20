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
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

import Nav from "@/components/Nav.vue";
import Content from "@/components/panel/containers/Content.vue";
import Header from "@/components/panel/containers/Header.vue";
import Message from "@/components/panel/elements/Message.vue";

export default defineComponent({
  name: "Home",
  components: {
    Nav,
    Content,
    Header,
    Message,
  },
  setup() {
    const active = computed(() => useStore().state.active);
    return { active };
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
    animation: mymove 3s infinite;
    animation-timing-function: ease-in-out;

@keyframes mymove {
  0% {background-color: black;}
  50% {background-color: red;}
  100% {background-color: black;}
}
</style>
