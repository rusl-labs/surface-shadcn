import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The playground and registry wrappers must share the workspace's core.
      "@rusl-labs/surface": createRequire(
        new URL("../package.json", import.meta.url),
      ).resolve("@rusl-labs/surface"),
      "@rusl-labs/surface-shadcn": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    },
  },
  server: { host: "127.0.0.1", port: 3100, strictPort: true },
});
