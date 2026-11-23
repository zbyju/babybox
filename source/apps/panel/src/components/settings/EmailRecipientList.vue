<template>
  <fieldset class="recipient-list" :disabled="disabled">
    <legend>{{ label }}</legend>
    <div
      class="recipient-editor"
      :class="{ inactive: !editing }"
      :inert="!editing"
    >
      <label :for="inputId">
        {{
          editingIndex === null
            ? "Nová e-mailová adresa"
            : "Upravit e-mailovou adresu"
        }}
      </label>
      <BaseInput
        :id="inputId"
        ref="addressInput"
        v-model="draft"
        type="text"
        inputmode="email"
        autocomplete="email"
        maxlength="320"
        :aria-invalid="!!error"
        :aria-describedby="error ? inputId + '-error' : undefined"
        @update:model-value="error = ''"
        @keydown.enter.prevent="apply"
        @keydown.esc.prevent="cancel"
      />
      <p
        :id="inputId + '-error'"
        class="recipient-error"
        :role="error ? 'alert' : undefined"
      >
        {{ error }}
      </p>
      <div class="recipient-actions">
        <BaseButton size="small" variant="primary" @click="apply">
          {{ editingIndex === null ? "Přidat" : "Uložit změnu" }}
        </BaseButton>
        <BaseButton size="small" variant="secondary" @click="cancel"
          >Zrušit</BaseButton
        >
      </div>
    </div>

    <div class="recipient-scroll">
      <ul v-if="recipients.length" class="recipient-rows">
        <li v-for="(address, index) in recipients" :key="address">
          <span>{{ address }}</span>
          <div class="recipient-actions">
            <BaseButton
              size="small"
              variant="secondary"
              :aria-label="`Upravit adresu ${address}`"
              :disabled="editing"
              @click="start(index)"
              >Upravit</BaseButton
            >
            <BaseButton
              size="small"
              variant="secondary"
              :aria-label="`Odebrat adresu ${address}`"
              :disabled="editing"
              @click="remove(index)"
              >Odebrat</BaseButton
            >
          </div>
        </li>
      </ul>
      <p v-else class="recipient-empty">Žádní adresáti</p>
    </div>

    <BaseButton
      ref="addButton"
      size="small"
      variant="secondary"
      :aria-label="`Přidat adresu · ${label}`"
      :disabled="editing"
      @click="start(null)"
      >Přidat adresu</BaseButton
    >
  </fieldset>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref, useId, useTemplateRef } from "vue";

  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";
  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";

  const props = defineProps<{
    label: string;
    value: string;
    disabled?: boolean;
    save: (value: string) => Promise<boolean>;
  }>();
  const editing = ref(false);
  const recipients = computed(() => [
    ...new Set(props.value.split(/[\s,;]+/).filter(Boolean)),
  ]);
  const inputId = useId();
  const addressInput = useTemplateRef("addressInput");
  const addButton = useTemplateRef("addButton");
  const editingIndex = ref<number | null>(null);
  const draft = ref("");
  const error = ref("");
  let editTrigger: HTMLElement | null = null;

  function start(index: number | null) {
    editTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    editingIndex.value = index;
    draft.value = index === null ? "" : (recipients.value[index] ?? "");
    error.value = "";
    editing.value = true;
    void nextTick(() => {
      const input = addressInput.value?.$el;
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  }

  async function apply() {
    if (props.disabled) return;
    const address = draft.value.trim();
    if (
      !/^[^\s@<>,;]+@[^\s@<>,;]+$/u.test(address) ||
      address.length > 320 ||
      Array.from(address).some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      error.value = "Zadejte jednu platnou e-mailovou adresu.";
      return;
    }

    const index = editingIndex.value;
    if (
      recipients.value.some(
        (item, position) => item === address && position !== index,
      )
    ) {
      error.value = "Tato adresa už je v seznamu.";
      return;
    }

    const next = [...recipients.value];
    if (index === null) next.push(address);
    else next[index] = address;
    const serialized = next.join(",");
    if (next.length > 100 || serialized.length > 8000) {
      error.value =
        "Seznam je příliš dlouhý. Nejdřív odeberte některou adresu.";
      return;
    }
    if (await props.save(serialized)) finish();
  }

  async function remove(index: number) {
    if (props.disabled || editing.value) return;
    const next = recipients.value
      .filter((_, position) => position !== index)
      .join(",");
    if (await props.save(next)) focusAdd();
  }

  function finish() {
    editing.value = false;
    editingIndex.value = null;
    focusAdd();
  }

  function cancel() {
    editing.value = false;
    editingIndex.value = null;
    if (editTrigger?.isConnected) {
      void nextTick(() => editTrigger?.focus());
    } else {
      focusAdd();
    }
  }

  function focusAdd() {
    void nextTick(() => {
      const button = addButton.value?.$el;
      if (button instanceof HTMLElement) button.focus();
    });
  }
</script>

<style scoped lang="stylus">
  .recipient-list
    display grid
    align-content start
    gap 10px
    border 0
    padding 0
    margin 0
    min-width 0

  legend
    font-weight 700
    padding 0 0 8px

  .recipient-editor
    display grid
    gap 6px
    padding 10px
    background #191638
    border-radius 6px
    &.inactive
      visibility hidden

  .recipient-scroll
    block-size 8rem
    overflow-y auto
    scrollbar-gutter stable

  .recipient-rows
    list-style none
    padding 0
    margin 0

  .recipient-rows li
    display flex
    flex-wrap wrap
    justify-content space-between
    align-items center
    gap 8px
    padding 6px 0
    border-bottom 1px solid #3b3763
    overflow-wrap anywhere

  .recipient-actions
    display flex
    flex-wrap wrap
    gap 6px

  .recipient-list > button
    justify-self start

  .recipient-empty, .recipient-error
    margin 0
    font-size .9rem

  .recipient-empty
    color #c4c7de

  .recipient-error
    color #ffc0cb
    min-height 2.5em
</style>
