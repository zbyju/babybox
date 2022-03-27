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
  background-color app-bg-black
  border 1px solid app-border-secondary
  border-radius 5px
  padding 5px 4px
  color white
  flex-grow 1
  font-size 1.1em
</style>
