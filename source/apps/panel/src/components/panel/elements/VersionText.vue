<template>
  <div class="version">
    <span class="version-text"
      >F-{{ versions.frontend }} / B-{{ versions.backend }} / C-{{
        versions.configer
      }}
      / S-{{ versions.startup }}</span
    >
  </div>
</template>

<script lang="ts" setup>
  import { useVersionsStore } from "@/pinia/versions";

  const versionStore = useVersionsStore();
  const versions = versionStore.versions;
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
