<template>
  <div id="BabyboxName">
    <span v-if="prependBabybox" id="BabyboxPrependText" :style="textStyle"
      >Babybox
    </span>
    <span id="BabyboxNameText" :style="textStyle">{{ babyboxName }}</span>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const configStore = useConfigStore();
    const { babybox, fontSize } = storeToRefs(configStore);

    const textStyle = {
      fontSize: fontSize.value.babyboxName + "vw",
    };
    return {
      babyboxName: babybox.value.name,
      prependBabybox: babybox.value.prependBabyboxBeforeName,
      textStyle,
    };
  },
});
</script>

<style lang="stylus">
#BabyboxName
  padding-right 10px

  span
    font-size 2vw
    font-weight 700

  span#BabyboxPrependText
    color text-brand
</style>
