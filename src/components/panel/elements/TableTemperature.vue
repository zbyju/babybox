<template>
  <div id="TableTemperature">
    <table>
      <thead>
        <tr>
          <th colspan="2">Teplota</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Nastavení</td>
          <td>28-0.0+5.0°C</td>
        </tr>
        <tr>
          <td>Vnitřní</td>
          <td>27.1°C</td>
        </tr>
        <tr>
          <td>Venkovní</td>
          <td>8.1°C</td>
        </tr>
        <tr>
          <td>Skříně</td>
          <td>48.3°C</td>
        </tr>
        <tr>
          <td>Horní</td>
          <td>29.8°C</td>
        </tr>
        <tr>
          <td>Dolní</td>
          <td>37.9°C</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  setup() {
    return {};
  },
});
</script>

<style lang="stylus"></style>
