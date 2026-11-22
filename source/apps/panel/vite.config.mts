import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4000,
  },
  /*
   * pinia 4 imports @vue/devtools-api, and only a guard on this flag keeps
   * @vue/devtools-kit out of the bundle a box loads. Rollup 2 folds it away
   * today; saying it here means the Vite 8 swap cannot quietly undo that.
   */
  define: { __VUE_PROD_DEVTOOLS__: false },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      stylus: {
        imports: [
          fileURLToPath(
            new URL("./src/assets/styles/variables.styl", import.meta.url),
          ),
        ],
      },
    },
  },
  build: {
    outDir: "./dist",
    // Keep the browser targets shipped by the previous Vite build.
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
  },
});
