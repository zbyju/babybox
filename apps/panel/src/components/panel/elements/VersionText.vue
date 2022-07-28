<template>
  <div class="version">
    <span class="version-text"
      >F-{{ versionFrontend }} / B-{{ versionBackend }}</span
    >
  </div>
</template>

<script lang="ts" setup>
  const props = defineProps<{
    versionFrontend: string;
    versionBackend: string;
  }>();
</script>

<style lang="stylus">
  div.version
    display flex
    align-items center
    padding 0 10px

    .version-text
      color #b8b8b8
      font-size 15px
</style>
