<template>
  <div id="BabyboxName">
    <span v-if="prependBabybox" id="BabyboxPrependText">Babybox </span>
    <span id="BabyboxNameText">{{ babyboxName }}</span>
  </div>
</template>

<script lang="ts" setup>
  import { useConfigStore } from "@/pinia/configStore";
  import { storeToRefs } from "pinia";

  const configStore = useConfigStore();
  const { babybox } = storeToRefs(configStore);

  const babyboxName = babybox.value.name;
  const prependBabybox = babybox.value.prependBabyboxBeforeName;
</script>

<style lang="stylus">
  #BabyboxName
    padding-right 10px

    span
      font-size font-size-babyboxName vw
      font-weight 700

    span#BabyboxPrependText
      color color-text-brand
</style>
