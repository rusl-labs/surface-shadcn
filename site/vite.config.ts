import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(new URL("./package.json", import.meta.url));

/** Bare imports from the repo's kit and example resolve from this site's npm install. */
function resolveFromSite(): Plugin {
  return {
    name: "resolve-from-site",
    enforce: "pre",
    resolveId(source) {
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
      try {
        return require.resolve(source, { paths: [siteRoot] });
      } catch {
        return null;
      }
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
