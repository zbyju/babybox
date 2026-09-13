<template>
  <div class="config-field">
    <label class="field-label">
      {{ props.state.field.label }}
      <span v-if="props.state.field.suffix" class="field-suffix">
        ({{ props.state.field.suffix }})
      </span>
    </label>

    <div class="field-widget">
      <BaseSelect
        v-if="props.state.field.widget === 'select'"
        :options="props.state.field.options ?? []"
        :model-value="props.state.value"
        :state="inputState"
        :disabled="disabled"
        @update:model-value="(value: string) => emit('update', value)"
      />
      <BaseInput
        v-else
        :type="inputType"
        :pattern="pattern"
        :model-value="props.state.value"
        :state="inputState"
        :disabled="disabled"
        @update:model-value="(value: string) => emit('update', value)"
      />
      <BaseButton
        v-if="props.state.field.secret"
        variant="accent"
        size="small"
        type="button"
        @click="revealed = !revealed"
      >
        {{ revealed ? "Skrýt" : "Zobrazit" }}
      </BaseButton>
    </div>

    <div class="field-values">
      <span class="value-current">{{ currentLabel }}</span>
      <span class="value-default">{{ defaultLabel }}</span>
      <span class="value-tier">{{ tierLabel }}</span>
    </div>

    <p v-if="props.state.field.hint" class="field-hint">
      {{ props.state.field.hint }}
    </p>
    <p v-for="error in props.state.errors" :key="error" class="field-error">
      {{ error }}
    </p>
    <p v-if="props.state.warning" class="field-warning">
      {{ props.state.warning }}
    </p>
  </div>
</template>

<script lang="ts" setup>
  import { applyTierLabels } from "@babybox/config-schema";
  import { computed, ref } from "vue";

  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";
  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";
  import BaseSelect from "@/components/panel/HTMLElements/BaseSelect.vue";
  import { type FieldState, IPV4_PATTERN } from "@/logic/config/configForm";
  import { BaseInputState } from "@/types/base/baseInput.types";

  const props = defineProps<{
    state: FieldState;
    /** A save is in flight, so an edit made now would be lost by the reload. */
    saving: boolean;
  }>();

  const emit = defineEmits<{
    (e: "update", value: string): void;
  }>();

  const revealed = ref(false);

  const disabled = computed(
    () => props.state.field.readOnly === true || props.saving,
  );

  const inputType = computed(() => {
    if (props.state.field.widget === "number") return "number";
    if (props.state.field.widget === "password" && !revealed.value)
      return "password";
    return "text";
  });

  /*
   * Browsers only enforce a pattern inside a submitted form, so this is a hint.
   * The real check is the warning from formState, which does not block a save:
   * the schema takes any string here and a hostname does reach the unit.
   */
  const pattern = computed(() =>
    props.state.field.widget === "ip" ? IPV4_PATTERN : undefined,
  );

  /*
   * Ordered by how bad it is, so a warning is not hidden by the edit that caused it.
   * The "Uloženo:" line and the section's change count already say the field changed.
   */
  const inputState = computed(() => {
    if (props.state.errors.length > 0) return BaseInputState.Error;
    if (props.state.warning) return BaseInputState.Warning;
    if (props.state.changed) return BaseInputState.Accent;
    return BaseInputState.Neutral;
  });

  const tierLabel = computed(() => applyTierLabels[props.state.field.tier]);

  function masked(value: string): string {
    if (value === "") return "—";
    if (props.state.field.secret && !revealed.value) return "••••••";
    return value;
  }

  const currentLabel = computed(
    () => `Uloženo: ${masked(props.state.current)}`,
  );

  const defaultLabel = computed(
    () => `Výchozí: ${masked(props.state.defaultValue)}`,
  );
</script>

<style lang="stylus">
  .config-field
    display flex
    flex-direction column
    gap 4px
    padding 10px 0

    .field-label
      font-weight 700
      font-size 0.9em

    .field-suffix
      font-weight 400
      color color-text-secondary

    .field-widget
      display flex
      flex-direction row
      align-items center
      gap 8px

    .field-values
      display flex
      flex-direction row
      flex-wrap wrap
      gap 12px
      font-size 0.75em
      color color-text-secondary

    .value-tier
      color color-text-warning

    .field-hint
      margin 0
      font-size 0.75em
      color color-text-secondary

    .field-error
      margin 0
      font-size 0.8em
      font-weight 700
      color color-text-error

    .field-warning
      margin 0
      font-size 0.8em
      color color-text-warning
</style>
