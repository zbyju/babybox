<template>
  <div id="BabyboxName">
    <span v-if="prependBabybox" id="BabyboxPrependText" :style="textStyle"
      >Babybox
    </span>
    <span id="BabyboxNameText" :style="textStyle">{{ babyboxName }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { Config } from "@/types/panel/main";

export default defineComponent({
  setup() {
    const store = useStore();
    const config = computed((): Config => store.state.config);

    const textStyle = {
      fontSize: config.value.fontSizes.babyboxName + "vw",
    };
    return {
      babyboxName: config.value.babybox.name,
      prependBabybox: config.value.babybox.prependBabyboxBeforeName,
      config,
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
