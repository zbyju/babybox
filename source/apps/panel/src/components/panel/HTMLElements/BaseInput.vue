<template>
  <input
    class="base-input"
    :type="type"
    :placeholder="props.placeholder"
    :pattern="props.pattern"
    :value="props.modelValue ?? ''"
    :class="classState"
    :disabled="props.disabled"
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
    pattern?: string | undefined;
    disabled?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  function inputChange(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      emit("update:modelValue", event.target.value);
    }
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
    panel-field()

  input.border-accent
    border 1px solid color-border-accent
  input.border-success
    border 1px solid color-border-success
  input.border-warning
    border 1px solid color-border-warning
  input.border-error
    border 1px solid color-border-error
</style>
