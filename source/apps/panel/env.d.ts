/// <reference types="vite/client" />

// Oxlint's native type checker needs a declaration for SFC imports.
// vue-tsc resolves the individual components and checks their prop types.
declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}
