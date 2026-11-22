<template>
  <section
    class="mini-panel"
    :class="{ 'with-message': showMessage }"
    aria-label="Živý náhled Babyboxu"
  >
    <CameraWrapper :display-doors="true" show-empty-doors class="mini-camera">
      <template #overlay>
        <span
          class="connection-icon"
          :class="health"
          role="img"
          :aria-label="connectionLabel"
          :title="connectionLabel"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <circle cx="12" cy="20" r="1.25" fill="currentColor" />
          </svg>
        </span>
      </template>
    </CameraWrapper>
    <p
      v-if="showMessage"
      class="mini-message"
      :class="messageTone"
      :role="messageTone === 'error' ? 'alert' : 'status'"
    >
      {{
        panel.message?.text ??
        (health === "online" ? "Vše v pořádku" : connectionLabel)
      }}
    </p>
  </section>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import { connectionAlert } from "@/logic/panel/connections";
  import { useConfigStore } from "@/pinia/configStore";
  import { useConnectionStore } from "@/pinia/connectionStore";
  import { usePanelStateStore } from "@/pinia/panelStateStore";

  import CameraWrapper from "./CameraWrapper.vue";

  withDefaults(defineProps<{ showMessage?: boolean }>(), { showMessage: true });
  const config = useConfigStore();
  const { engineUnit, thermalUnit } = useConnectionStore();
  const panel = usePanelStateStore();
  const health = computed(() => {
    const connection = { engineUnit, thermalUnit };
    if (connectionAlert(connection, config.units) === "error") return "offline";
    if (
      !engineUnit.successes ||
      !thermalUnit.successes ||
      engineUnit.failStreak ||
      thermalUnit.failStreak
    )
      return "connecting";
    return "online";
  });
  const connectionLabel = computed(() => {
    if (health.value === "offline") return "Výpadek spojení s jednotkami";
    if (health.value === "connecting") return "Ověřuji spojení s jednotkami";
    return "Spojení s jednotkami je v pořádku";
  });
  const messageTone = computed(() => {
    if (panel.message) {
      if (panel.message.color === "color-text-error") return "error";
      if (panel.message.color === "color-text-warning") return "warning";
      if (panel.message.color === "color-text-success") return "success";
      return "info";
    }
    return health.value === "online"
      ? "success"
      : health.value === "offline"
        ? "error"
        : "warning";
  });
</script>

<style scoped lang="stylus">
  .mini-panel
    width 280px
    max-width 100%
    display grid
    border-radius 6px
    overflow hidden

  .mini-camera
    width 100%
    max-width 100%
    height auto

  .mini-camera :deep(.camera-frame)
    aspect-ratio 16 / 9
    height auto
    overflow hidden
    background color-bg-black
    border 1px solid #3b3763
    box-sizing border-box

  .with-message .mini-camera :deep(.camera-frame)
    border-bottom 0

  .mini-camera :deep(.camera-door-bars)
    width 100%
    min-height 4px
    background #25224b
    border-radius 4px 4px 0 0

  .mini-camera :deep(iframe)
    border 0

  .mini-camera :deep(.verticalPositionBar)
    flex-basis 0

  .mini-camera :deep(img), .mini-camera :deep(.camera-error), .mini-camera :deep(.camera-loading)
    box-sizing border-box
    width 100%
    height 100%
    min-width 0
    min-height 0
    border 0
    border-radius 0

  .mini-camera :deep(.camera-error), .mini-camera :deep(.camera-loading)
    display grid
    place-items center
    margin 0
    h4
      margin 0
      color #ded9ff

  .connection-icon
    position absolute
    top 8px
    left 8px
    padding 5px
    line-height 0
    border-radius 6px
    background #100e2c
    svg
      width 22px
      height 22px
    &.online
      color #8ee8b8
    &.connecting
      color #ffcd88
    &.offline
      color #ffc0cb

  .mini-message
    margin 0
    padding 6px 10px
    border-radius 0 0 6px 6px
    font-weight 700
    font-size .88rem
    line-height 1.4
    &.success
      color #a0f0c6
      background #14382e
    &.warning
      color #ffcd88
      background #3c281c
    &.error
      color #ffc0cb
      background #472135
    &.info
      color #ded9ff
      background #25224b
</style>
