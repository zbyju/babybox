<template>
  <details
    ref="help"
    class="inline-help"
    @keydown.esc="close"
    @focusout="close"
  >
    <summary :aria-label="label"><span aria-hidden="true">?</span></summary>
    <p><slot /></p>
  </details>
</template>

<script lang="ts" setup>
  import { useTemplateRef } from "vue";

  defineProps<{ label: string }>();
  const help = useTemplateRef("help");

  function close() {
    if (help.value) help.value.open = false;
  }
</script>

<style scoped>
  .inline-help {
    display: inline-block;
    position: relative;
    vertical-align: middle;
    font-size: 0.85rem;
    font-weight: normal;
  }

  summary {
    display: grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    background: #25224b;
    color: #ded9ff;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary:focus-visible {
    outline: 2px solid #c3b6ff;
    outline-offset: 2px;
  }

  p {
    position: absolute;
    z-index: 2;
    top: calc(100% + 6px);
    left: 0;
    box-sizing: border-box;
    width: 16rem;
    max-width: 65vw;
    margin: 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: #25224b;
    color: #fff;
    line-height: 1.5;
    box-shadow: 0 4px 12px #0008;
  }

  @media (max-width: 650px) {
    p {
      position: static;
    }
  }
</style>
