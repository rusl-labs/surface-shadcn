import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryKit } from "@rusl-labs/surface";

const repo = fileURLToPath(new URL("..", import.meta.url));

function resolvedFrom(manifest: string) {
  return realpathSync(createRequire(manifest).resolve("@rusl-labs/surface"));
}

const rootManifest = join(repo, "package.json");
const exampleManifest = join(repo, "example/package.json");
const fromTests = resolvedFrom(rootManifest);
const fromPlayground = resolvedFrom(exampleManifest);
const fromViteAlias = fromTests;

if (fromTests !== fromPlayground || fromTests !== fromViteAlias) {
  throw new Error(
    `Split Surface runtime:\n  tests: ${fromTests}\n  playground: ${fromPlayground}\nThe playground and tests must resolve one realpath.`,
  );
}

const kit = createRegistryKit({ fallback: () => null });
if (typeof kit.getViews !== "function") {
  throw new Error(
    `Resolved Surface at ${fromTests} has no getViews. This workspace needs the local core with view discovery and item annotations, not published 0.1.0.`,
  );
}

console.log(`Surface runtime: ${fromTests}`);
