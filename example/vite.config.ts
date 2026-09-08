import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@rusl-labs/surface-shadcn": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    },
  },
  server: { host: "127.0.0.1", port: 5173 },
});
