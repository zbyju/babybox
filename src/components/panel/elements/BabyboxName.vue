<template>
  <div id="BabyboxName">
    <p>Test: {{ config }}</p>
    <span>{{ babyboxName }}</span>
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
    return { babyboxName, config };
  },
});
</script>

<style lang="stylus">
#BabyboxName
  span
    font-size 40px
</style>
