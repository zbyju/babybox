<template>
  <div id="BabyboxName">
    <span :style="textStyle"> {{ babyboxName }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { useStore } from "vuex";
import { Config } from "@/types/main";

export default defineComponent({
  setup() {
    const store = useStore();
    const config = computed((): Config => store.state.config);

    const babyboxName = ref(
      config.value.babybox.prependBabyboxBeforeName
        ? "Babybox " + config.value.babybox.name
        : config.value.babybox.name
    );
    const textStyle = {
      fontSize: config.value.babybox.fontSize + "px",
    };
    return { babyboxName, config, textStyle };
  },
});
</script>

<style lang="stylus">
#BabyboxName
  span
    font-size 40px
</style>
