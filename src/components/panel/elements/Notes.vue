<template>
  <div id="Notes">
    <p>Poznámky:</p>
    <Textarea></Textarea>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Textarea from "@/components/panel/HTMLElements/Textarea.vue";

export default defineComponent({
  components: {
    Textarea,
  },
});
</script>

<style lang="stylus">
#Date
  white-space nowrap
  font-size 1.7vw
  font-weight 600
  color: text-secondary
</style>
