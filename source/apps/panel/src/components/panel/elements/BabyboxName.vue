<template>
  <div id="BabyboxName">
    <span id="BabyboxPrependText">Babybox </span>
    <span id="BabyboxNameText">{{ babyboxName }}</span>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";

  import { useConfigStore } from "@/pinia/configStore";

  const configStore = useConfigStore();
  const { babybox } = storeToRefs(configStore);

  const babyboxName = babybox.value.name;
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
