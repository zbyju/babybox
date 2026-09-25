<template>
  <input
    :type="type"
    v-bind="optionalAttrs"
    :value="props.modelValue ?? ''"
    :class="classState"
    :disabled="props.disabled === true"
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

  /*
   * Left off when unset, as Vue did with undefined.
   * An empty pattern would reject every value.
   */
  const optionalAttrs = computed(() => {
    const attrs: { placeholder?: string; pattern?: string } = {};
    if (props.placeholder !== undefined) attrs.placeholder = props.placeholder;
    if (props.pattern !== undefined) attrs.pattern = props.pattern;
    return attrs;
  });

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
  input.border-success
    border 1px solid color-border-success
  input.border-warning
    border 1px solid color-border-warning
  input.border-error
    border 1px solid color-border-error

  input:focus
    border 1px solid color-border-secondary

  input:disabled
    color color-text-secondary
    cursor not-allowed
</style>
