import { fileURLToPath, URL } from "url";
import path from "path";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

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
                    path.resolve(
                        __dirname,
                        "./src/assets/styles/variables.styl"
                    ),
                ],
            },
        },
    },
});
