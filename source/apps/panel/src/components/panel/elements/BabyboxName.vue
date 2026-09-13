<template>
  <button
    id="BabyboxName"
    type="button"
    :aria-label="`Babybox ${babyboxName}, přejít na heslo`"
    @click="onTitleClick"
  >
    <span id="BabyboxPrependText">Babybox </span>
    <span id="BabyboxNameText">{{ babyboxName }}</span>
  </button>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";

  import { focusPanelPassword } from "@/logic/panel/scroll";
  import { useConfigStore } from "@/pinia/configStore";

  const configStore = useConfigStore();
  const { babybox } = storeToRefs(configStore);

  const babyboxName = babybox.value.name;

  const onTitleClick = () => focusPanelPassword();
</script>

<style lang="stylus">
  #BabyboxName
    padding 0 10px 0 0
    background transparent
    border 0
    cursor pointer
    text-align left
    font-family inherit
    color inherit

    span
      font-size font-size-babyboxName vw
      font-weight 700

    span#BabyboxPrependText
      color color-text-brand

    &:focus-visible
      outline 2px solid color-text-brand
      outline-offset 4px
</style>
