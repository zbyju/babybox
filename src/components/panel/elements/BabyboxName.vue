<template>
  <div id="BabyboxName">
    <span v-if="prependBabybox" id="BabyboxPrependText">Babybox </span>
    <span id="BabyboxNameText">{{ babyboxName }}</span>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const configStore = useConfigStore();
    const { babybox } = storeToRefs(configStore);

    return {
      babyboxName: babybox.value.name,
      prependBabybox: babybox.value.prependBabyboxBeforeName,
    };
  },
});
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
