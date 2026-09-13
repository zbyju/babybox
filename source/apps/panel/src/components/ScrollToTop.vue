<template>
  <button id="ScrollToTop" type="button" aria-label="Nahoru" @click="onClick">
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
</template>

<script lang="ts" setup>
  import { scrollWindowToTop } from "@/logic/panel/scroll";

  const onClick = () => scrollWindowToTop();
</script>

<style lang="stylus">
  #ScrollToTop
    position fixed
    right 24px
    bottom 24px
    z-index 50
    width 56px
    height 56px
    padding 0
    border 0
    border-radius 50%
    cursor pointer
    color color-text-white
    background-color color-primary
    background-image linear-gradient(120deg, color-primary 0%, #4A148C 40%, color-primary-hover 70%, color-primary 100%)
    background-size 220% 220%
    background-position 0% 50%
    box-shadow 0 0 18px rgba(40, 53, 147, 0.45)
    display flex
    align-items center
    justify-content center

    svg
      width 28px
      height 28px

    &:hover
      filter brightness(1.12)
      box-shadow 0 0 22px rgba(40, 53, 147, 0.65)

    &:focus-visible
      outline 2px solid color-text-white
      outline-offset 3px

  @media (prefers-reduced-motion: reduce)
    #ScrollToTop
      &:hover
        filter none
</style>
