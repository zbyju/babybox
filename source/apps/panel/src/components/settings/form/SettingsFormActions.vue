<template>
  <div id="Actions">
    <h2>Akce</h2>
    <div class="action-wrapper">
      <BaseButton variant="primary" @click="$emit('click:load')">
        Načíst aktuální parametry
      </BaseButton>
      <BaseButton variant="accent" @click="$emit('click:insertRecommended')">
        Doplnit doporučené parametry
      </BaseButton>
      <BaseButton variant="success" @click="$emit('click:save')">
        Uložit parametry
      </BaseButton>
      <BaseButton variant="error" @click="$emit('click:remove')">
        Smazat nové hodnoty
      </BaseButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";

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
</style>
