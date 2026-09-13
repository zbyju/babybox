<template>
  <div class="config-section" :class="{ open: expanded }">
    <button
      type="button"
      class="section-header"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <h3>{{ props.section.label }}</h3>
      <span v-if="changedCount > 0" class="section-changed">
        Změn: {{ changedCount }}
      </span>
      <span class="section-count">{{ fieldCountLabel }}</span>
      <span class="section-chevron" aria-hidden="true">›</span>
    </button>
    <div v-show="expanded" class="section-body">
      <ConfigFormField
        v-for="state in props.states"
        :key="state.field.path"
        :state="state"
        :saving="props.saving"
        @update="(value: string) => emit('update', state.field.path, value)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { FormSection } from "@babybox/config-schema";
  import { computed, ref } from "vue";

  import ConfigFormField from "@/components/config/ConfigFormField.vue";
  import type { FieldState } from "@/logic/config/configForm";

  const props = defineProps<{
    section: FormSection;
    states: FieldState[];
    /** A save is in flight, so the inputs are locked. */
    saving: boolean;
    /** The first section starts open so the click-to-expand pattern is visible. */
    initiallyOpen?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update", path: string, value: string): void;
  }>();

  const expanded = ref(props.initiallyOpen === true);

  const changedCount = computed(
    () => props.states.filter((state) => state.changed).length,
  );

  const fieldCountLabel = computed(() => {
    const count = props.states.length;
    if (count === 1) return "1 pole";
    if (count >= 2 && count <= 4) return `${count} pole`;
    return `${count} polí`;
  });
</script>

<style lang="stylus">
  .config-section
    background-color color-bg-primary
    border 1px solid color-border-primary
    border-radius 8px
    width 100%

    .section-header
      display flex
      flex-direction row
      align-items center
      gap 12px
      width 100%
      margin 0
      padding 14px 16px
      border 0
      background-color transparent
      color inherit
      font inherit
      text-align left
      cursor pointer
      border-radius 8px

    .section-header:hover
      background-color color-bg-primary-hover

    h3
      margin 0
      font-size 1.05em

    .section-changed
      padding 2px 8px
      border-radius 8px
      background-color color-primary
      font-size 0.75em
      font-weight 700

    .section-count
      color color-text-secondary
      font-size 0.8em

    .section-chevron
      margin-left auto
      font-size 1.6em
      font-weight 300
      line-height 1
      transition transform 0.2s ease

    &.open .section-chevron
      transform rotate(90deg)

    .section-body
      display grid
      grid-template-columns repeat(auto-fill, minmax(280px, 1fr))
      gap 4px 24px
      padding 0 16px 12px 16px
      border-top 1px solid color-border-primary
</style>
