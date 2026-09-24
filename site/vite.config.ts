import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));
const siteEntry = fileURLToPath(new URL("./src/main.tsx", import.meta.url));

/**
 * Kit and example files live outside this package. Resolve their bare imports
 * as if the homepage imported them, so Vite still prebundles CommonJS packages
 * such as React instead of serving `require()` to the browser.
 */
function resolveFromSite(): Plugin {
  return {
    name: "resolve-from-site",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || importer.startsWith(siteRoot)) return null;
      if (
        source.startsWith(".") ||
        source.startsWith("/") ||
        source.startsWith("\0") ||
        source.startsWith("@/") ||
        source.startsWith("@rusl-labs/surface-shadcn") ||
        source.startsWith("node:")
      ) {
        return null;
      }
      const resolved = await this.resolve(source, siteEntry, {
        ...options,
        skipSelf: true,
      });
      return resolved ?? null;
    },
  };
}

export default defineConfig({
  root: siteRoot,
  plugins: [resolveFromSite(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../example/src", import.meta.url)),
      "@rusl-labs/surface-shadcn": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    port: 3200,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
});
