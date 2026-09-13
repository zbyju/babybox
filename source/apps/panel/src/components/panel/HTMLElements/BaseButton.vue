<template>
  <button
    class="base-button"
    :class="[`variant-${variant}`, `size-${size}`]"
    :disabled="disabled"
    :type="type"
  >
    <span class="base-button-label"><slot /></span>
  </button>
</template>

<script lang="ts" setup>
  import type {
    ButtonSize,
    ButtonVariant,
  } from "@/types/base/baseButton.types";

  withDefaults(
    defineProps<{
      variant: ButtonVariant;
      size?: ButtonSize;
      disabled?: boolean;
      type?: "button" | "submit" | "reset";
    }>(),
    {
      size: "default",
      disabled: false,
      type: "button",
    },
  );
</script>

<!--
  Scoped to `.base-button`, not to bare `button`: the style block is global, so a
  bare rule would restyle every other button once this chunk's CSS has loaded.
-->
<style lang="stylus">
  @keyframes base-button-gradient-shift
    0%
      background-position 0% 50%
    50%
      background-position 100% 50%
    100%
      background-position 0% 50%

  .base-button
    position relative
    isolation isolate
    overflow hidden
    display inline-flex
    flex-direction row
    align-items center
    justify-content center
    flex-shrink 0
    padding 10px 14px
    border 0
    color color-text-white
    font-weight 700
    font-size 0.9em
    border-radius 8px
    height 40px
    white-space nowrap
    cursor pointer
    background-size 220% 220%
    background-position 0% 50%
    transition box-shadow 0.3s ease, filter 0.3s ease

    .base-button-label
      position relative
      z-index 1

  .base-button.size-small
    height 30px
    padding 5px 8px
    font-weight 600
    font-size 0.8em

  .base-button.size-card
    min-width 230px
    min-height 100px
    height auto
    padding 10px 16px
    border-radius 20px
    font-size 1.1em
    font-weight 600

  .base-button.variant-primary
    background-color color-primary
    background-image linear-gradient(120deg, color-primary 0%, #4A148C 40%, color-primary-hover 70%, color-primary 100%)

  .base-button.variant-success
    background-color color-success
    background-image linear-gradient(120deg, color-success 0%, #00E5A0 40%, color-success-hover 70%, color-success 100%)

  .base-button.variant-error
    background-color color-error
    background-image linear-gradient(120deg, color-error 0%, #D8003D 40%, color-error-hover 70%, color-error 100%)

  .base-button.variant-warning
    background-color color-warning
    background-image linear-gradient(120deg, color-warning 0%, #F0A04B 40%, color-warning-hover 70%, color-warning 100%)

  .base-button.variant-accent
    background-color color-accent
    background-image linear-gradient(120deg, color-accent 0%, #7C4DFF 40%, color-accent-hover 70%, color-accent 100%)

  .base-button:hover:not(:disabled)
    animation base-button-gradient-shift 2.2s ease infinite

  .base-button.variant-primary:hover:not(:disabled)
    box-shadow 0 0 18px rgba(40, 53, 147, 0.55)

  .base-button.variant-success:hover:not(:disabled)
    box-shadow 0 0 18px rgba(0, 192, 61, 0.45)

  .base-button.variant-error:hover:not(:disabled)
    box-shadow 0 0 18px rgba(244, 67, 54, 0.45)

  .base-button.variant-warning:hover:not(:disabled)
    box-shadow 0 0 18px rgba(224, 122, 31, 0.5)

  .base-button.variant-accent:hover:not(:disabled)
    box-shadow 0 0 18px rgba(83, 35, 196, 0.55)

  .base-button:disabled
    animation none
    background-image none
    background-color color-bg-primary-hover
    color color-text-secondary
    cursor not-allowed
    box-shadow none

  @media (prefers-reduced-motion: reduce)
    .base-button:hover:not(:disabled)
      animation none
      background-position 100% 50%
</style>
