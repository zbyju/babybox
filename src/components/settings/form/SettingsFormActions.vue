<template>
  <div id="Actions">
    <h2>Akce</h2>
    <div class="action-wrapper">
      <button class="btn-primary" @click="$emit('click:load')">
        Načíst aktuální parametry
      </button>
      <button class="btn-primary" @click="$emit('click:insertRecommended')">
        Doplnit doporučené parametry
      </button>
      <button class="btn-success" @click="$emit('click:save')">
        Uložit parametry
      </button>
      <button class="btn-error" @click="$emit('click:remove')">
        Smazat nové hodnoty
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  const emit = defineEmits<{
    (e: "click:load"): void;
    (e: "click:insertRecommended"): void;
    (e: "click:save"): void;
    (e: "click:remove"): void;
  }>();
</script>

<style lang="stylus">
  #Actions
    div.action-wrapper
      display flex
      flex-direction row
      flex-wrap wrap
      gap 10px

  button
    display inline-block
    padding 10px 12px
    border 0
    background-color color-bg-primary
    color color-text-white
    transition all 0.5s ease-in-out
    font-weight 700
    font-size 0.9em
    border-radius 8px
    height 40px
  button:hover
    cursor pointer

  button.btn-primary
    background-color color-primary
  button.btn-success
    background-color color-success
  button.btn-error
    background-color color-error
  button.btn-warning
    background-color color-warning
  button.btn-primary:hover
    background-color color-primary-hover
  button.btn-success:hover
    background-color color-success-hover
  button.btn-error:hover
    background-color color-error-hover
  button.btn-warning:hover
    background-color color-warning-hover
  button.btn-small
    height 30px
    padding 5px 7px
    font-weight 600
    font-size 0.8em
</style>
