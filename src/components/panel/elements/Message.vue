<template>
  <div id="Message" :class="heightStyle">
    <div class="message" v-if="message" :class="message.color">
      {{ message.text }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import useDelayedMessage from "@/composables/useDelayedMessage";

export default defineComponent({
  setup() {
    const store = useStore();
    const message = computed(() => store.state.message);
    const { messageDelayed, heightStyle } = useDelayedMessage(message);
    return { message: messageDelayed, heightStyle };
  },
});
</script>

<style lang="stylus">
#Message
  grid-area message
  padding 0 padding-x

  margin -5px auto 5px auto
  display flex
  flex-direction column
  justify-content center
  align-self center

  overflow hidden
  transition 0.1s all

  .message
    font-size 6vw
    line-height 0.9em
    font-weight 700
    color warning
    text-align center
    padding 5px 0 25px 0
    overflow hidden
    transition 1s all
    transition-delay 1s

#Message.hidden
  max-height 0px;
  .message
    opacity 0
#Message.visible
  max-height 500px;
  .message
    opacity 1
</style>
