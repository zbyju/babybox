<template>
  <div id="Navbar">
    <div class="links">
      <div v-for="link in links" :key="link.label">
        <template v-if="link.secured && !isUnlocked">
          <a class="link disabled">
            {{ link.label }}
          </a>
        </template>
        <template v-else>
          <a
            v-if="link.external"
            class="link"
            :href="link.link"
            target="_blank"
          >
            {{ link.label }}
          </a>
          <router-link v-else class="link" :to="{ name: link.link }">{{
            link.label
          }}</router-link>
        </template>
      </div>
    </div>
    <Input type="password" placeholder="Heslo" v-model="password" />
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { Config } from "@/types/panel/main";
import { storeToRefs } from "pinia";
import { computed, defineComponent, ref } from "vue";
import Input from "./panel/HTMLElements/Input.vue";

export default defineComponent({
  components: { Input },
  setup() {
    const configStore = useConfigStore();
    const { app, units, camera } = storeToRefs(configStore);

    const isUnlocked = computed(() => {
      return password.value === app.value.password;
    });
    const password = ref("");

    return {
      isUnlocked,
      password,
      links: [
        {
          link: "Main",
          label: "Panel",
          external: false,
          secured: false,
        },
        {
          link: "Settings",
          label: "Nastavení",
          external: false,
          secured: true,
        },
        {
          link: "http://localhost:3000/",
          label: "BB-Util",
          external: true,
          secured: true,
        },
        {
          link: "Data",
          label: "Data",
          external: false,
          secured: true,
        },
        {
          link: `http://${units.value.engine.ip}/`,
          label: "SDS Motory",
          external: true,
          secured: true,
        },
        {
          link: `http://${units.value.thermal.ip}/`,
          label: "SDS Topení",
          external: true,
          secured: true,
        },
        {
          link: `http://${camera.value.ip}/`,
          label: "Kamera",
          external: true,
          secured: true,
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
  border-top 1px solid #2d2b52
  border-collapse collapse
  display flex
  flex-direction row


  div.links
    display flex
    flex-direction row
    flex-grow 1

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

  a.link.disabled
    color text-white-error

  a.link:hover
    background-color #020024
    border-bottom 1px solid #4A148C

  a.link.disabled
    background-color #010017
    border-bottom 1px solid #2d2b52
    cursor not-allowed

  input
    width 100px
    height 50%
    align-self center
    flex-grow 0
    padding 3px
    font-size 0.8em
    margin-right 30px
</style>
