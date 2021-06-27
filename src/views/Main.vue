<template>
  <div id="Main">
    <div id="MainWrapper">
      <Header></Header>
      <Message></Message>
      <Content></Content>
    </div>
    <Nav></Nav>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

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

  display grid
  grid-template-columns 100%;
  grid-template-rows: min-content 1fr minmax(35%, min-content);
  grid-template-areas:
  "header"\
  "message"\
  "content"\
</style>
