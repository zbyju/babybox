<template>
  <template v-if="state === AppState.Loading">
    <div class="AppStateLoading">
      <h1 class="loadingAnimation">Načítám</h1>
    </div>
  </template>
  <template v-else-if="state === AppState.Error">
    <div class="AppStateLoading">
      <h1 class="errorAnimation">Error</h1>
      <p>{{ message || "" }}</p>
    </div>
  </template>
  <template v-if="state === AppState.Ok">
    <slot></slot>
  </template>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";

  import { useAppStateStore } from "@/pinia/appStateStore";
  import { AppState } from "@/types/app/appState.types";

  const appStateStore = useAppStateStore();
  const { state, message } = storeToRefs(appStateStore);
</script>

<style lang="stylus">
  .AppStateLoading
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
      padding 10px 0

    p
      margin 0
      padding 0
      text-align center
      font-size 25px

  .errorAnimation
    background: rgb(216,0,61);
    background: linear-gradient(138deg, rgba(215,0,104,1) 0%, rgba(255,0,0,1) 33%, rgba(216,0,61,1) 66%, rgba(255,0,0,1) 100%);
    background-size 160% auto

    color: #000;
    background-clip: text;
    text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    animation: shine 5s linear infinite alternate;
    @keyframes shine {
      to {
        background-position: 160% center;
      }
    }

  .loadingAnimation
    background: rgb(216,0,61);
    background: linear-gradient(138deg, rgba(216,0,61,1) 0%, rgba(0,234,255,1) 33%, rgba(216,0,61,1) 66%, rgba(0,234,255,1) 100%);
    background-size 160% auto

    color: #000;
    background-clip: text;
    text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    animation: shine 5s linear infinite alternate;
    @keyframes shine {
      to {
        background-position: 160% center;
      }
    }
</style>
