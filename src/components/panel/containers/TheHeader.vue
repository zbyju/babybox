<template>
  <div id="Header">
    <div id="HeaderLeft">
      <BabyboxName/>
      <div id="DateTimeWrapper">
        <FullDate/>
        <FullTime/>
      </div>
    </div>
    <BigClock/>
  </div>
</template>

<script lang="ts">
import BabyboxName from "@/components/panel/elements/BabyboxName.vue";
import BigClock from "@/components/panel/elements/BigClock.vue";
import FullDate from "@/components/panel/elements/FullDate.vue";
import FullTime from "@/components/panel/elements/FullTime.vue";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    BabyboxName,
    FullTime,
    FullDate,
    BigClock,
  },
});
</script>

<style lang="stylus">
#Header
  grid-area header

  padding padding-y padding-x

  width calc(100% - 30px)

  display flex
  flex-direction row
  justify-content space-between

  #HeaderLeft
    display flex
    flex-direction column
    max-width 35%

  #DateTimeWrapper
    display flex
    flex-direction row
    align-items flex-end
    gap 10px
</style>
