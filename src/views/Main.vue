<template>
  <div id="Main">
    <div id="MainWrapper">
      <Header></Header>
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

export default defineComponent({
  name: "Home",
  components: {
    Nav,
    Content,
    Header,
  },
});
</script>

<style lang="stylus">
#MainWrapper
  min-height 100vh
  height 100vh
  max-height 100vh

  display grid
</style>
