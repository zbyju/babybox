<template>
  <div id="Actions">
    <h2>Akce</h2>
    <div class="action-wrapper">
      <button class="btn-primary" @click="manager.loadSettings">
        Načíst aktuální parametry
      </button>
      <button class="btn-primary" @click="manager.insertDefault">
        Doplnit doporučené parametry
      </button>
      <button class="btn-success" @click="manager.saveSettings">
        Uložit parametry
      </button>
      <button class="btn-error" @click="manager.deleteChanges">
        Smazat nové hodnoty
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { AppManager } from "@/utils/store";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    manager: {
      type: AppManager,
      required: true,
    },
  },
});
</script>

<style lang="stylus">
#Actions
  div.action-wrapper
    display flex
    flex-direction row
    flex-wrap wrap
    gap 10px

button
  display inline-block
  padding 10px 12px
  border 0
  background-color app-primary
  color white
  transition all 0.5s ease-in-out
  font-weight 700
  font-size 0.9em
  border-radius 8px
  height 40px
button:hover
  cursor pointer

button.btn-primary
  background-color app-primary
button.btn-success
  background-color app-success
button.btn-error
  background-color app-error
button.btn-warning
  background-color app-warning
button.btn-primary:hover
  background-color app-primary-hover
button.btn-success:hover
  background-color app-success-hover
button.btn-error:hover
  background-color app-error-hover
button.btn-warning:hover
  background-color app-warning-hover
button.btn-small
  height 30px
  padding 5px 7px
  font-weight 600
  font-size 0.8em
</style>
