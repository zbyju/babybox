<template>
  <img
    v-show="!error"
    ref="imageRef"
    :src="url"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  />
  <div
    v-show="error"
    class="camera-error"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  >
    <h4>Error</h4>
    <p>Chyba při načítání kamery.</p>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { type Ref, onMounted, ref } from "vue";

  import useCamera from "@/composables/useCamera";
  import { useConfigStore } from "@/pinia/configStore";

  const props = defineProps<{
    displayTopBorder: boolean;
  }>();

  const emit = defineEmits<{
    (e: "updatedImage", width: number, height: number): void;
  }>();

  const error = ref(false);

  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);
  const url: Ref<string> = useCamera(camera.value);

  const imageRef = ref<HTMLImageElement | null>(null);
  onMounted(() => {
    if (imageRef.value) {
      imageRef.value.onerror = () => (error.value = true);
      imageRef.value.onload = () => (error.value = false);
    }
  });
</script>

<style lang="stylus">
  border-width = 5px
  img
    max-height 100%
    height 100%
    width 100%
    object-fit contain;
    overflow hidden
    border 3px solid color-border-primary
    border-radius 0 0 5px 5px
    align-self center
    min-width 160px
    min-height 90px

  .camera-error
    max-height 100%
    width 100%
    overflow hidden
    border 3px solid #862222
    border-radius 0 0 5px 5px
    align-self center
    text-align center
    min-width 160px
    min-height 90px

    h4
      color color-text-error
</style>
