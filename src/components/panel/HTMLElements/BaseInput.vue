<template>
  <input
    :type="type"
    :placeholder="placeholder"
    :value="props.modelValue"
    :class="classState"
    @input="inputChange"
  />
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import { BaseInputState } from "@/types/base/baseInput.types";

  const props = defineProps<{
    type: string;
    placeholder?: string;
    modelValue?: string;
    state?: BaseInputState;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  function inputChange(event: Event) {
    emit("update:modelValue", (event.target as HTMLInputElement).value);
  }

  const classState = computed(() =>
    props.state === BaseInputState.Accent
      ? "border-accent"
      : props.state === BaseInputState.Success
      ? "border-success"
      : props.state === BaseInputState.Warning
      ? "border-warning"
      : props.state === BaseInputState.Error
      ? "border-error"
      : "",
  );
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

  input.border-accent
    border 1px solid color-border-accent
  input.border-sucess
    border 1px solid color-border-success
  input.border-warning
    border 1px solid color-border-warning
  input.border-error
    border 1px solid color-border-error

  input:focus
    border 1px solid color-border-secondary
</style>
