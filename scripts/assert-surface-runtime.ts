import { createRequire } from "node:module";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryKit, listFields } from "@rusl-labs/surface";

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
    `Resolved Surface at ${fromTests} has no getViews. This workspace needs @rusl-labs/surface 0.1.1 or later.`,
  );
}

// The site has its own install/React tree. Its core build must match the local
// checkout and the root's isolated Bun install, even if their realpaths differ.
function fingerprint(directory: string): string {
  const hash = createHash("sha256");
  for (const path of readdirSync(directory, { recursive: true }).map(String).sort()) {
    if (/\.(js|ts)$/.test(path)) hash.update(path).update(readFileSync(join(directory, path)));
  }
  return hash.digest("hex");
}
const localDist = join(repo, "../surface/packages/core/dist");
const fromSite = resolvedFrom(join(repo, "site/package.json"));
for (const installed of [fromTests, fromSite]) {
  if (fingerprint(dirname(installed)) !== fingerprint(localDist)) {
    throw new Error(`Stale local Surface build at ${installed}. Build ../surface/packages/core, then reinstall the root and site dependencies with bun install --force.`);
  }
}
const subject = "https://example.test/runtime-probe";
const headings = listFields({
  schema: { type: "object" }, annotation: { subject, views: { default: { fields: [{ label: "", widget: { name: "separator" } }] } } },
  coordinate: { subject, path: [] }, mode: "input", view: "default",
});
if (headings[0]?.kind !== "heading" || headings[0].widget?.name !== "separator") {
  throw new Error("Local Surface must preserve standalone presentation entries. Build the sibling checkout's standalone-heading patch before continuing.");
}
console.log(`Surface runtime: ${fromTests}\nSite runtime: ${fromSite}\nBoth match ${localDist}; standalone presentation supported.`);
