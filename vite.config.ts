import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { viteCommonjs } from "@originjs/vite-plugin-commonjs"
import * as path from "path"

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        // https: true
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    plugins: [
        vue(),
        viteCommonjs()
    ],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                waveHelper: path.resolve(__dirname, "waveHelper.html")
            }
        }
    }
})
