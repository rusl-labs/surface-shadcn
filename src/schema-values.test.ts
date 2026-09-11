import { test, expect } from "bun:test";
import type { Schema, SchemaResolver } from "@rusl-labs/surface";
import { seedValue } from "./seed-value";
import { applyConstAndDefaults } from "./apply-const-defaults";

const noResolver: SchemaResolver = { resolveSchema: async () => undefined };

// ---- seedValue --------------------------------------------------------------

test("seedValue prefers const, then default", () => {
  expect(seedValue({ const: "fixed" })).toBe("fixed");
  expect(seedValue({ type: "string", default: "hi" })).toBe("hi");
});

test("seedValue never auto-selects an enum member", () => {
  expect(seedValue({ enum: ["a", "b"] })).toBeUndefined();
});

test("seedValue keeps empty numeric drafts empty, not zero", () => {
  expect(seedValue({ type: "integer" })).toBeUndefined();
  expect(seedValue({ type: "number" })).toBeUndefined();
});

test("seedValue objects carry only required and const/default-bearing props", () => {
  expect(
    seedValue({
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        $kind: { const: "urn:x" },
        country: { type: "string", default: "US" },
        note: { type: "string" }, // optional, no fixed value → absent
      },
    }),
  ).toEqual({ name: "", $kind: "urn:x", country: "US" });
});

test("seedValue recurses required nested objects", () => {
  expect(
    seedValue({
      type: "object",
      required: ["loc"],
      properties: {
        loc: {
          type: "object",
          required: ["city"],
          properties: { city: { type: "string" }, tz: { type: "string" } },
        },
      },
    }),
  ).toEqual({ loc: { city: "" } });
});

// ---- applyConstAndDefaults ---------------------------------------------------

test("forces a whole-node const over existing data", async () => {
  expect(await applyConstAndDefaults({ const: 5 }, 99, noResolver)).toBe(5);
});

test("fills a default only for an absent slot, never over present or null", async () => {
  const schema: Schema = { type: "string", default: "d" };
  expect(await applyConstAndDefaults(schema, undefined, noResolver)).toBe("d");
  expect(await applyConstAndDefaults(schema, "present", noResolver)).toBe(
    "present",
  );
  // Explicit null is a value, not an absent slot: preserved for the validator.
  expect(await applyConstAndDefaults(schema, null, noResolver)).toBeNull();
});

test("forces present/required consts, fills defaults, drops untouched optionals", async () => {
  const schema: Schema = {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      $kind: { const: "urn:contact" },
      country: { type: "string", default: "US" },
      note: { type: "string" },
    },
  };
  expect(
    await applyConstAndDefaults(
      schema,
      { name: "Alex", $kind: "wrong", note: "hi" },
      noResolver,
    ),
  ).toEqual({ name: "Alex", $kind: "urn:contact", note: "hi", country: "US" });
});

test("leaves an optional absent const absent, forces a present one", async () => {
  const schema: Schema = {
    type: "object",
    required: [],
    properties: { $kind: { const: "k" } },
  };
  expect(await applyConstAndDefaults(schema, {}, noResolver)).toEqual({});
  expect(
    await applyConstAndDefaults(schema, { $kind: "stale" }, noResolver),
  ).toEqual({ $kind: "k" });
});

test("preserves explicit null and wrong-type values instead of coercing to {}", async () => {
  const schema: Schema = {
    type: "object",
    properties: {
      a: { type: "object", properties: { x: { type: "integer", default: 1 } } },
    },
  };
  // Whole value null → not coerced to a filled object.
  expect(await applyConstAndDefaults(schema, null, noResolver)).toBeNull();
  // Nested null preserved (validator will flag it).
  expect(await applyConstAndDefaults(schema, { a: null }, noResolver)).toEqual({
    a: null,
  });
  // Wrong-type nested value preserved, not replaced by a filled object.
  expect(await applyConstAndDefaults(schema, { a: "str" }, noResolver)).toEqual(
    { a: "str" },
  );
});

test("resolves a repeated $ref for every array item (regression: shared visited)", async () => {
  const resolver: SchemaResolver = {
    resolveSchema: async (uri) =>
      uri === "urn:item"
        ? ({
            type: "object",
            properties: { enabled: { type: "boolean", default: true } },
          } as Schema)
        : undefined,
  };
  const schema: Schema = { type: "array", items: { $ref: "urn:item" } };
  expect(await applyConstAndDefaults(schema, [{}, {}], resolver)).toEqual([
    { enabled: true },
    { enabled: true },
  ]);
});

test("resolves relative refs against the document and preserves a sibling default", async () => {
  const doc: Schema = {
    $id: "urn:contact",
    type: "object",
    properties: {
      loc: { $ref: "#/$defs/loc" },
      loc2: { $ref: "#/$defs/loc", default: { tz: "sib" } },
    },
    $defs: {
      loc: {
        type: "object",
        properties: { tz: { type: "string", default: "UTC" } },
      },
    },
  };
  expect(
    await applyConstAndDefaults(doc, { loc: {} }, noResolver, {
      document: doc,
      documentUri: "urn:contact",
    }),
  ).toEqual({ loc: { tz: "UTC" }, loc2: { tz: "sib" } });
});

test("does not stack overflow on a self-referential $ref", async () => {
  const doc: Schema = {
    $id: "urn:tree",
    type: "object",
    properties: {
      child: { $ref: "#/$defs/node" },
      label: { type: "string", default: "L" },
    },
    $defs: {
      node: {
        type: "object",
        properties: {
          child: { $ref: "#/$defs/node" },
          label: { type: "string", default: "L" },
        },
      },
    },
  };
  const out = await applyConstAndDefaults(
    doc,
    { child: { child: {} } },
    noResolver,
    {
      document: doc,
      documentUri: "urn:tree",
    },
  );
  expect(out).toEqual({
    label: "L",
    child: { label: "L", child: { label: "L" } },
  });
});

test("layers allOf arm defaults", async () => {
  const schema: Schema = {
    allOf: [
      { type: "object", properties: { a: { type: "string", default: "A" } } },
      { type: "object", properties: { b: { type: "string", default: "B" } } },
    ],
  };
  expect(await applyConstAndDefaults(schema, {}, noResolver)).toEqual({
    a: "A",
    b: "B",
  });
});

test("leaves oneOf/anyOf untouched instead of guessing a branch", async () => {
  const schema: Schema = {
    oneOf: [
      { type: "object", properties: { a: { type: "string", default: "A" } } },
    ],
  };
  expect(
    await applyConstAndDefaults(schema, { given: true }, noResolver),
  ).toEqual({ given: true });
});

test("prepares chained refs and sibling properties together", async () => {
  const document: Schema = {
    $id: "urn:chain",
    $defs: {
      alias: { $ref: "#/$defs/base" },
      base: { type: "object", properties: { inherited: { default: "base" } } },
    },
  };
  const result = await applyConstAndDefaults(
    { $ref: "#/$defs/alias", properties: { local: { default: "sibling" } } },
    {},
    noResolver,
    { document, documentUri: "urn:chain" },
  );
  expect(result).toEqual({ inherited: "base", local: "sibling" });
});

test("honors falsy const and default values, not just truthy ones", async () => {
  // Whole-node const forces a falsy value over present data; a truthiness
  // check (`if (node.const)`) would wrongly leave 0 / false / "" as the data.
  expect(await applyConstAndDefaults({ const: 0 }, 99, noResolver)).toBe(0);
  expect(await applyConstAndDefaults({ const: false }, true, noResolver)).toBe(
    false,
  );
  expect(await applyConstAndDefaults({ const: "" }, "x", noResolver)).toBe("");
  // Default fills a genuinely absent slot even when the default itself is falsy.
  expect(
    await applyConstAndDefaults(
      { type: "integer", default: 0 },
      undefined,
      noResolver,
    ),
  ).toBe(0);
  expect(
    await applyConstAndDefaults(
      { type: "boolean", default: false },
      undefined,
      noResolver,
    ),
  ).toBe(false);
});
