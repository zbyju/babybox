<template>
  <select
    :value="props.modelValue"
    :class="classState"
    :disabled="props.disabled"
    @change="selectChange"
  >
    <option v-for="option in props.options" :key="option" :value="option">
      {{ option }}
    </option>
  </select>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import { BaseInputState } from "@/types/base/baseInput.types";

  const props = defineProps<{
    options: readonly string[];
    modelValue?: string;
    state?: BaseInputState;
    disabled?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  function selectChange(event: Event) {
    emit("update:modelValue", (event.target as HTMLSelectElement).value);
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
  select
    background-color color-bg-black
    border 1px solid color-border-secondary
    border-radius 5px
    padding 5px 4px
    color color-text-white
    flex-grow 1
    font-size 1.1em

  select.border-accent
    border 1px solid color-border-accent
  select.border-success
    border 1px solid color-border-success
  select.border-warning
    border 1px solid color-border-warning
  select.border-error
    border 1px solid color-border-error

  select:disabled
    color color-text-secondary
    cursor not-allowed
</style>
