/// <reference types="vite/client" />

// The Oxlint type backend resolves TS imports but has no Vue language plugin.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}
