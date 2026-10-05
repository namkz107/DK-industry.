import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(currentDirectory, "./src") } },
  server: {
    port: 3000,
    open: true,
  },
  build: { target: "es2020", cssCodeSplit: true, sourcemap: false },
})
