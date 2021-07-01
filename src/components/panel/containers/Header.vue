<template>
  <div id="Header">
    <div id="HeaderLeft">
      <BabyboxName></BabyboxName>
      <div id="DateTimeWrapper">
        <Date></Date>
        <Time></Time>
      </div>
      <Notes></Notes>
    </div>
    <BigClock></BigClock>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import BigClock from "@/components/panel/elements/BigClock.vue";
import BabyboxName from "@/components/panel/elements/BabyboxName.vue";
import Time from "@/components/panel/elements/Time.vue";
import Date from "@/components/panel/elements/Date.vue";
import Notes from "@/components/panel/elements/Notes.vue";

export default defineComponent({
  setup() {
    return {};
  },
  components: {
    BabyboxName,
    Time,
    Date,
    BigClock,
    Notes,
  },
});
</script>

<style lang="stylus">
#Header
  grid-area header

  padding padding-y padding-x

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
