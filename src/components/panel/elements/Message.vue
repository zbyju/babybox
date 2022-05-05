<template>
  <div id="Message" :class="heightStyle">
    <div
      class="message"
      v-if="message"
      :class="message.color"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<script lang="ts">
import useDelayedMessage from "@/composables/useDelayedMessage";
import { useAppStateStore } from "@/pinia/appStateStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const appStateStore = useAppStateStore();
    const { message } = storeToRefs(appStateStore);
    const { messageDelayed, heightStyle } = useDelayedMessage(message);
    return { message: messageDelayed, heightStyle };
  },
});
</script>

<style lang="stylus">
#Message
  grid-area message
  padding 0 padding-x

  margin -5px auto 15px auto
  display flex
  flex-direction column
  justify-content center
  align-self center

  overflow hidden

  .message
    font-size 6vw
    line-height 0.9em
    font-weight 700
    text-align center
    padding 5px 0 25px 0
    overflow hidden

#Message.hidden
  animation-name heightOut
  animation-duration 1s
  animation-fill-mode both
  animation-delay 1s
  .message
    animation-name opacityOut
    animation-duration 1s
    animation-fill-mode both
#Message.visible
  animation-name heightIn
  animation-duration 1s
  animation-fill-mode both
  .message
    animation-name opacityIn
    animation-duration 1s
    animation-fill-mode both
    animation-delay 1s

@keyframes heightIn {
  from {
    max-height 0px
  }
  to {
    max-height 500px
  }
}

@keyframes heightOut {
  from {
    max-height 500px
  }
  to {
    max-height 0px
  }
}

@keyframes opacityIn {
  from {
    opacity 0
  }
  to {
    opacity 1
  }
}
@keyframes opacityOut {
  from {
    opacity 1
  }
  to {
    opacity 0
  }
}
</style>
