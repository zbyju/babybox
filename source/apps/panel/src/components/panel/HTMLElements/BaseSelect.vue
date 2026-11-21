<template>
  <select
    class="base-select"
    :value="props.modelValue ?? ''"
    :class="classState"
    :disabled="props.disabled"
    @change="selectChange"
  >
    <option v-for="option in props.options" :key="option" :value="option">
      {{ props.optionLabels?.[option] ?? option }}
    </option>
  </select>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import { BaseInputState } from "@/types/base/baseInput.types";

  const props = defineProps<{
    options: readonly string[];
    optionLabels?: Readonly<Record<string, string>>;
    modelValue?: string;
    state?: BaseInputState;
    disabled?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  function selectChange(event: Event) {
    if (event.target instanceof HTMLSelectElement) {
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

<!--
  Scoped to the class, not to bare `select`: the style block is global, so a bare
  rule would follow every other select in the app once this chunk's CSS has loaded.
-->
<style lang="stylus">
  select.base-select
    panel-field()
    appearance none
    padding-inline-end 36px
    background-image url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='%23ded9ff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
    background-repeat no-repeat
    background-position right 12px center
    background-size 16px

    @media (forced-colors: active)
      appearance auto
      background-image none

  select.base-select.border-accent
    border 1px solid color-border-accent
  select.base-select.border-success
    border 1px solid color-border-success
  select.base-select.border-warning
    border 1px solid color-border-warning
  select.base-select.border-error
    border 1px solid color-border-error
</style>
