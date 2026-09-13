<template>
  <div id="FloatingActions">
    <div class="floating-actions-cluster">
      <button
        id="FloatingGoToPanel"
        class="floating-action variant-primary size-large"
        type="button"
        aria-label="Panel"
        @click="onGoToPanel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 11l8-7 8 7M6 10.5V20h12V10.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        id="FloatingScrollUp"
        class="floating-action variant-success size-small"
        type="button"
        aria-label="Nahoru"
        @click="onScrollUp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 14l6-6 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { useRouter } from "vue-router";

  import { scrollWindowToTop } from "@/logic/panel/scroll";

  const router = useRouter();

  const onScrollUp = () => scrollWindowToTop();
  const onGoToPanel = () => {
    void router.push({ name: "Main" });
  };
</script>

<!--
  The gradient-shift keyframes match BaseButton. They live here too so the
  cluster still animates if that chunk has not loaded (the data page).
-->
<style lang="stylus">
  @keyframes floating-action-gradient-shift
    0%
      background-position 0% 50%
    50%
      background-position 100% 50%
    100%
      background-position 0% 50%

  #FloatingActions
    position fixed
    right 24px
    bottom 24px
    z-index 50
    padding-top 26px
    padding-right 26px
    pointer-events none

  .floating-actions-cluster
    position relative
    width 84px
    height 84px

  .floating-action
    isolation isolate
    overflow hidden
    display flex
    align-items center
    justify-content center
    padding 0
    border 0
    border-radius 50%
    cursor pointer
    pointer-events auto
    color color-text-white
    background-size 220% 220%
    background-position 0% 50%
    transition box-shadow 0.3s ease, transform 0.2s ease

    svg
      display block

    &:hover
      animation floating-action-gradient-shift 2.2s ease infinite
      transform scale(1.06)

    &:focus-visible
      outline 2px solid color-text-white
      outline-offset 3px

  .floating-action.size-large
    width 84px
    height 84px

    svg
      width 42px
      height 42px

  .floating-action.size-small
    position absolute
    top -17px
    right -17px
    z-index 1
    width 52px
    height 52px

    svg
      width 26px
      height 26px

  .floating-action.variant-primary
    background-color color-primary
    background-image linear-gradient(120deg, color-primary 0%, #4A148C 40%, color-primary-hover 70%, color-primary 100%)
    box-shadow 0 0 0 3px color-bg-black, 0 0 18px rgba(40, 53, 147, 0.45)

    &:hover
      box-shadow 0 0 0 3px color-bg-black, 0 0 22px rgba(40, 53, 147, 0.7)

  .floating-action.variant-success
    background-color color-success
    background-image linear-gradient(120deg, color-success 0%, #00E5A0 40%, color-success-hover 70%, color-success 100%)
    box-shadow 0 0 0 3px color-bg-black, 0 0 18px rgba(0, 192, 61, 0.45)

    &:hover
      box-shadow 0 0 0 3px color-bg-black, 0 0 22px rgba(0, 192, 61, 0.7)

  @media (prefers-reduced-motion: reduce)
    .floating-action
      &:hover
        animation none
        background-position 100% 50%
        transform none
</style>
