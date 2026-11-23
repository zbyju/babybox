<template>
  <fieldset class="recipient-list" :disabled="disabled">
    <legend>{{ label }}</legend>
    <form class="recipient-editor" @submit.prevent="apply(null)">
      <BaseInput
        :id="inputId"
        ref="addressInput"
        v-model="newAddress"
        type="text"
        inputmode="email"
        autocomplete="email"
        maxlength="320"
        placeholder="E-mailová adresa"
        :aria-label="`Nová e-mailová adresa · ${label}`"
        :aria-invalid="!!errors.add"
        :aria-describedby="errors.add ? inputId + '-error' : undefined"
        @update:model-value="errors.add = ''"
      />
      <div class="recipient-actions">
        <BaseButton size="small" type="submit" variant="secondary">
          Přidat
        </BaseButton>
      </div>
    </form>
    <p
      v-if="errors.add"
      :id="inputId + '-error'"
      class="recipient-error"
      role="alert"
    >
      {{ errors.add }}
    </p>

    <div v-if="recipients.length" class="recipient-scroll">
      <ul class="recipient-rows">
        <li v-for="(address, index) in recipients" :key="address">
          <form
            v-if="editingIndex === index"
            class="recipient-editor"
            @submit.prevent="apply(index)"
          >
            <BaseInput
              :id="inputId + '-edit'"
              v-model="editAddress"
              type="text"
              inputmode="email"
              autocomplete="email"
              maxlength="320"
              :aria-label="`Upravit e-mailovou adresu · ${label}`"
              :aria-invalid="!!errors.edit"
              :aria-describedby="
                errors.edit ? inputId + '-edit-error' : undefined
              "
              @update:model-value="errors.edit = ''"
              @keydown.esc.prevent="cancel"
            />
            <div class="recipient-actions">
              <BaseButton size="small" type="submit" variant="secondary"
                >Uložit</BaseButton
              >
              <BaseButton size="small" variant="secondary" @click="cancel"
                >Zrušit</BaseButton
              >
            </div>
            <p
              v-if="errors.edit"
              :id="inputId + '-edit-error'"
              class="recipient-error edit-error"
              role="alert"
            >
              {{ errors.edit }}
            </p>
          </form>
          <template v-else>
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
          </template>
        </li>
      </ul>
    </div>
  </fieldset>
</template>

<script lang="ts" setup>
  import {
    computed,
    nextTick,
    reactive,
    ref,
    useId,
    useTemplateRef,
  } from "vue";

  import BaseButton from "@/components/panel/HTMLElements/BaseButton.vue";
  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";

  const props = defineProps<{
    label: string;
    value: string;
    disabled?: boolean;
    save: (value: string) => Promise<boolean>;
  }>();
  const recipients = computed(() => [
    ...new Set(props.value.split(/[\s,;]+/).filter(Boolean)),
  ]);
  const inputId = useId();
  const addressInput = useTemplateRef("addressInput");
  const editingIndex = ref<number | null>(null);
  const editing = computed(() => editingIndex.value !== null);
  const newAddress = ref("");
  const editAddress = ref("");
  const errors = reactive({ add: "", edit: "" });

  function start(index: number) {
    editingIndex.value = index;
    editAddress.value = recipients.value[index] ?? "";
    errors.edit = "";
    void nextTick(() => {
      const input = document.getElementById(inputId + "-edit");
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  }

  async function apply(index: number | null) {
    if (props.disabled) return;
    const field = index === null ? "add" : "edit";
    const address = (
      index === null ? newAddress.value : editAddress.value
    ).trim();
    if (
      !/^[^\s@<>,;]+@[^\s@<>,;]+$/u.test(address) ||
      address.length > 320 ||
      Array.from(address).some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      errors[field] = "Zadejte jednu platnou e-mailovou adresu.";
      return;
    }

    if (
      recipients.value.some(
        (item, position) => item === address && position !== index,
      )
    ) {
      errors[field] = "Tato adresa už je v seznamu.";
      return;
    }

    const next = [...recipients.value];
    if (index === null) next.push(address);
    else next[index] = address;
    const serialized = next.join(",");
    if (next.length > 100 || serialized.length > 8000) {
      errors[field] =
        "Seznam je příliš dlouhý. Nejdřív odeberte některou adresu.";
      return;
    }
    if (await props.save(serialized)) {
      if (index === null) newAddress.value = "";
      else editingIndex.value = null;
      errors[field] = "";
      focusInput();
    }
  }

  async function remove(index: number) {
    if (props.disabled || editing.value) return;
    const next = recipients.value
      .filter((_, position) => position !== index)
      .join(",");
    if (await props.save(next)) focusInput();
  }

  function cancel() {
    if (!editing.value) return;
    editingIndex.value = null;
    errors.edit = "";
    focusInput();
  }

  function focusInput() {
    void nextTick(() => {
      const input = addressInput.value?.$el;
      if (input instanceof HTMLInputElement) input.focus();
    });
  }
</script>

<style scoped lang="stylus">
  .recipient-list
    display grid
    align-content start
    gap 4px
    border 0
    padding 0
    margin 0
    min-width 0

  legend
    font-weight 700
    padding 0 0 4px

  .recipient-editor
    display grid
    grid-template-columns minmax(0, 1fr) auto
    align-items center
    gap 8px
    :deep(input)
      width 100%
      min-width 0

  .recipient-scroll
    max-block-size 8rem
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
    padding 3px 0
    border-bottom 1px solid #3b3763
    overflow-wrap anywhere
    > form
      width 100%

  .recipient-actions
    display flex
    flex-wrap wrap
    gap 6px

  .recipient-error
    margin 0
    font-size .9rem
    color #ffc0cb
  .edit-error
    grid-column 1 / -1
</style>
