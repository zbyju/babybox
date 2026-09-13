<template>
  <div class="config-section">
    <div class="section-header">
      <h3>{{ props.section.label }}</h3>
      <span v-if="changedCount > 0" class="section-changed">
        Změn: {{ changedCount }}
      </span>
    </div>
    <ConfigFormField
      v-for="state in props.states"
      :key="state.field.path"
      :state="state"
      :saving="props.saving"
      @update="(value: string) => emit('update', state.field.path, value)"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { FormSection } from "@babybox/config-schema";
  import { computed } from "vue";

  import ConfigFormField from "@/components/config/ConfigFormField.vue";
  import type { FieldState } from "@/logic/config/configForm";

  const props = defineProps<{
    section: FormSection;
    states: FieldState[];
    /** A save is in flight, so the inputs are locked. */
    saving: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update", path: string, value: string): void;
  }>();

  const changedCount = computed(
    () => props.states.filter((state) => state.changed).length,
  );
</script>

<style lang="stylus">
  .config-section
    background-color color-bg-primary
    border 1px solid color-border-primary
    border-radius 8px
    padding 12px 16px

    .section-header
      display flex
      flex-direction row
      align-items center
      gap 12px

    h3
      margin 0 0 4px 0

    .section-changed
      padding 2px 8px
      border-radius 8px
      background-color color-primary
      font-size 0.75em
      font-weight 700

    .config-field:last-child
      border-bottom 0
</style>
