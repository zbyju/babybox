import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4000,
  },
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
          path.resolve(__dirname, "./src/assets/styles/variables.styl"),
        ],
      },
    },
  },
  build: {
    outDir: "./dist",
  },
});
