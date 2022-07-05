<template>
  <input
    :type="type"
    :placeholder="placeholder"
    :value="props.modelValue"
    @input="inputChange"
  />
</template>

<script lang="ts" setup>
  const props = defineProps<{
    type: string;
    placeholder: string;
    modelValue: string;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  function inputChange(event: Event) {
    emit("update:modelValue", (event.target as HTMLInputElement).value);
  }
</script>

<style lang="stylus">
  input
    background-color color-bg-black
    border 1px solid color-border-secondary
    border-radius 5px
    padding 5px 4px
    color color-text-white
    flex-grow 1
    font-size 1.1em
</style>
