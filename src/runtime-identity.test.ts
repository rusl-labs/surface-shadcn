import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { createRegistryKit } from "@rusl-labs/surface";

test("tests and the playground resolve one Surface with getViews", () => {
  const root = join(import.meta.dir, "..", "package.json");
  const example = join(import.meta.dir, "..", "example", "package.json");
  expect(realpathSync(createRequire(root).resolve("@rusl-labs/surface"))).toBe(
    realpathSync(createRequire(example).resolve("@rusl-labs/surface")),
  );
  expect(typeof createRegistryKit({ fallback: () => null }).getViews).toBe(
    "function",
  );
});
