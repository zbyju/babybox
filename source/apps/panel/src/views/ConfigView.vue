<template>
  <div class="panel-config">
    <p v-if="banner !== null" id="RestartBanner">
      <span>{{ banner }}</span>
      <BaseButton variant="primary" size="small" @click="onDismiss">
        Skrýt
      </BaseButton>
    </p>
    <ConfigForm></ConfigForm>
  </div>
</template>

<script lang="ts" setup>
  import { type Ref, ref } from "vue";

  import { clearBanner, readBanner } from "@/logic/config/restartBanner";

  import ConfigForm from "../components/config/ConfigForm.vue";
  import BaseButton from "../components/panel/HTMLElements/BaseButton.vue";

  /*
   * A save ends in window.location.reload(), so the last save's warning cannot be
   * component state. It sits in sessionStorage and this is the page that reads it.
   */
  const banner: Ref<string | null> = ref(readBanner());

  function onDismiss() {
    clearBanner();
    banner.value = null;
  }
</script>

<style scoped lang="stylus">
  #RestartBanner
    display flex
    flex-direction row
    align-items center
    justify-content space-between
    gap 16px
    margin 0 0 20px
    padding 12px 16px
    border-radius 8px
    background-color color-warning
    color color-text-white
    font-weight 700
</style>
