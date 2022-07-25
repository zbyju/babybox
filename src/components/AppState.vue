<template>
  <template v-if="state === AppState.Ok">
    <slot></slot>
  </template>
  <div v-else class="AppState">
    <template
      v-if="
        state === AppState.Loading || state === AppState.Trying || !initialised
      "
    >
      <h1 class="loadingAnimation textAnimation">Načítám</h1>
    </template>
    <template v-else-if="state === AppState.Error">
      <h1 class="errorAnimation textAnimation">Error</h1>
      <p>{{ message || "" }}</p>
    </template>

    <div class="ConfigState">
      <h2 :class="configClass">- Načítání konfiguračního souboru</h2>
    </div>
    <div class="BackendState">
      <h2 :class="backendClass">- Připojení k backend serveru</h2>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import { useAppStateStore } from "@/pinia/appStateStore";
  import { useConfigStore } from "@/pinia/configStore";
  import { AppState } from "@/types/app/appState.types";

  const appStateStore = useAppStateStore();
  const { state, message, done } = storeToRefs(appStateStore);

  const configStore = useConfigStore();
  const { initialised } = storeToRefs(configStore);

  const configClass = computed(() => {
    const d = done.value[0];
    if (d === undefined) {
      return "loadingAnimation";
    } else if (d === true) {
      return "successAnimation";
    }
    return "errorAnimation";
  });

  const backendClass = computed(() => {
    const d = done.value[1];
    if (d === undefined || d === false) {
      return "loadingAnimation";
    } else if (d === true) {
      return "successAnimation";
    }
    return "errorAnimation";
  });
</script>

<style lang="stylus">
  .AppState
    height 100vh
    width 100 vw
    overflow hidden
    background-color color-bg-black
    color color-text-white
    display: flex
    flex-direction: column
    justify-content: center

    h1
      font-size 50px
      text-transform uppercase
      text-align center
      color color-text-brand
      margin 0
      margin-bottom 20px

    h2
      font-size 25px
      font-weight 100
      text-align center
      color color-text-brand
      margin 0

    p
      margin 0
      padding 0
      text-align center
      font-size 25px

  .errorAnimation
    background: rgb(216,0,61);
    background: linear-gradient(138deg, rgba(215,0,104,1) 0%, rgba(255,0,0,1) 33%, rgba(216,0,61,1) 66%, rgba(255,0,0,1) 100%);
    background-size 125% auto

    background-clip text;
    text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #000;

    animation: shine 5s linear infinite alternate;
    @keyframes shine {
      to {
        background-position: 125% center;
      }
    }

  .loadingAnimation
    background: rgb(216,0,61);
    background: linear-gradient(138deg, rgba(216,0,61,1) 0%, rgba(0,234,255,1) 33%, rgba(216,0,61,1) 66%, rgba(0,234,255,1) 100%);
    background-size 125% auto

    background-clip text;
    text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #000;

    animation: shine 5s linear infinite alternate;
    @keyframes shine {
      to {
        background-position: 125% center;
      }
    }

  .successAnimation
    background: rgb(0,255,113);
    background: linear-gradient(138deg, rgba(0,255,113,1) 0%, rgba(0,153,109,1) 33%, rgba(0,255,113,1) 66%, rgba(0,153,109,1) 100%);
    background-size 125% auto


    background-clip text;
    text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #000;

    animation: shine 5s linear infinite alternate;
    @keyframes shine {
      to {
        background-position: 125% center;
      }
    }
</style>
