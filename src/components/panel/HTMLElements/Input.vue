<template>
  <input
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script lang="ts">
export default {
  props: ["modelValue", "type", "placeholder"],
  emits: ["update:modelValue"],
};
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
</style>
