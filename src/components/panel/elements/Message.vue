<template>
  <div id="Message">
    <div class="message" v-if="message" :class="message.color">
      {{ message.text }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    // const message = {
    //   text: "Babybox je mimo provoz",
    //   color: "text-warning",
    // };
    const message = null;
    return { message };
  },
});
</script>

<style lang="stylus">
#Message
  grid-area message
  padding 0 padding-x

  margin-bottom 1%
  display flex
  flex-direction column
  justify-content center

  transition 1s all

  .message
      font-size 6vw
      line-height 0.9em
      font-weight 700
      color warning
      text-align center
      padding 10px 0 20px 0
</style>
