<template>
  <div id="Settings">
    <TheNav />
    <main
      id="SettingsWrapper"
      :class="{ 'email-settings': activeTab === 'email' }"
    >
      <h1>Nastavení</h1>
      <nav class="settings-tabs" aria-label="Sekce nastavení">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.id"
          v-slot="{ href, navigate }"
          :to="tab.to"
          custom
        >
          <a
            :href="href"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="navigate"
            >{{ tab.label }}</a
          >
        </RouterLink>
      </nav>
      <template v-if="activeTab === 'email'">
        <p v-if="panelState.message" class="panel-alarm" role="alert">
          <span aria-hidden="true">? </span>{{ panelState.message.text }}
        </p>
        <EmailView />
      </template>
      <ConfigView v-else-if="activeTab === 'panel'" />
      <template v-else>
        <QuickActions />
        <SettingsForm />
      </template>
    </main>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onUnmounted } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import { usePanelStateStore } from "@/pinia/panelStateStore";

  import SettingsForm from "../components/settings/form/SettingsForm.vue";
  import QuickActions from "../components/settings/QuickActions.vue";
  import TheNav from "../components/TheNav.vue";
  import ConfigView from "./ConfigView.vue";
  import EmailView from "./EmailView.vue";

  const route = useRoute();
  const router = useRouter();
  const panelState = usePanelStateStore();
  const tabs = [
    { id: "units", label: "Jednotky", to: { name: "Settings" } },
    {
      id: "panel",
      label: "Panel",
      to: { name: "Settings", query: { tab: "panel" } },
    },
    {
      id: "email",
      label: "E-mail",
      to: { name: "Settings", query: { tab: "email" } },
    },
  ];
  const activeTab = computed(() => {
    const tab = route.query["tab"];
    return tab === "panel" || tab === "email" ? tab : "units";
  });

  const returnTimer = setTimeout(
    () => void router.push({ name: "Main" }),
    10 * 60 * 1000,
  );
  onUnmounted(() => clearTimeout(returnTimer));
</script>

<style lang="stylus">
  #Settings
    min-height 100vh
    width 100%
    background color-bg-primary
    color color-text-white

    #SettingsWrapper
      padding clamp(16px, 1.5vw, 32px)

    @media (min-width: 1100px)
      #SettingsWrapper.email-settings
        padding-right 138px

    .panel-alarm
      margin 0 0 16px
      border 1px solid #862222
      border-radius 8px
      padding 10px 14px
      background #472135
      color #ffc0cb
      font-weight 700

    h1
      font-size 1.85rem
      margin 0 0 12px

    .settings-tabs
      display flex
      gap 8px
      border-bottom 1px solid #3b3763
      margin-bottom 20px

    .settings-tabs a
      color #d4d2e8
      border-bottom 3px solid transparent
      padding 10px 20px
      font-weight 700
      text-decoration none
      border-radius 6px 6px 0 0

    .settings-tabs a:hover, .settings-tabs a[aria-current="page"]
      background #25224b
      color color-text-white

    .settings-tabs a[aria-current="page"]
      border-bottom-color #b29cff

    .settings-tabs a:focus-visible
      outline 2px solid #c3b6ff
      outline-offset 2px
</style>
