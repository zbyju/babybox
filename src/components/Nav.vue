<template>
  <div id="Navbar">
    <div v-for="link in links" :key="link.label">
      <a v-if="link.external" class="link" :href="link.link" target="_blank">
        {{ link.label }}
      </a>
      <router-link v-else class="link" :to="{ name: link.link }">{{
        link.label
      }}</router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { Config } from "@/types/panel/main";
import { defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  setup() {
    const store = useStore();
    const config: Config = store.state.config;

    return {
      links: [
        {
          link: "Main",
          label: "Panel",
          external: false,
        },
        {
          link: "Settings",
          label: "Nastavení",
          external: false,
        },
        {
          link: "http://localhost:3000/",
          label: "BB-Util",
          external: true,
        },
        {
          link: "Data",
          label: "Data",
          external: false,
        },
        {
          link: `http://${config.units.engine.ip}/`,
          label: "SDS Motory",
          external: true,
        },
        {
          link: `http://${config.units.thermal.ip}/`,
          label: "SDS Topení",
          external: true,
        },
        {
          link: `http://${config.camera.ip}/`,
          label: "Kamera",
          external: true,
        },
      ],
    };
  },
});
</script>

<style lang="stylus">
#Navbar
  min-width 100vw
  width 100vw
  max-width 100vw

  height 50px

  background-color #010017
  border-bottom 1px solid #2d2b52
  border-collapse collapse

  display flex
  flex-direction row

  a.link
    display flex
    flex-direction column
    justify-content center
    heigth 100%
    min-height 100%
    padding 0 20px
    font-weight 700
    color white
    text-decoration none
    transition all 0.5s ease-in-out
    border-bottom 1px solid #2d2b52

  a.link:hover
    background-color #020024
    border-bottom 1px solid #4A148C
</style>
