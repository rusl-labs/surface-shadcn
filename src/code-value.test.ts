import { expect, test } from "bun:test";
import { formatCode, isObjectWire, isOpenMap, parseCode } from "./code-value";

test("object wire pretty-prints and parses JSON objects", () => {
  expect(isObjectWire({ type: "object" })).toBe(true);
  expect(isObjectWire({ type: "string" })).toBe(false);
  expect(isOpenMap({ type: "object" })).toBe(true);
  expect(
    isOpenMap({
      type: "object",
      properties: { name: { type: "string" } },
    }),
  ).toBe(false);
  expect(
    isOpenMap({ type: "object", additionalProperties: false }),
  ).toBe(false);
  expect(formatCode({ a: 1 }, true)).toBe('{\n  "a": 1\n}');
  expect(formatCode(undefined, true)).toBe("");
  expect(parseCode('{"a":1}', true)).toEqual({
    kind: "value",
    data: { a: 1 },
  });
  expect(parseCode("", true)).toEqual({ kind: "empty" });
  expect(parseCode("{", true)).toEqual({
    kind: "issue",
    message: "Invalid JSON.",
  });
  expect(parseCode("[1]", true)).toEqual({
    kind: "issue",
    message: "JSON object required.",
  });
  expect(parseCode("null", true)).toEqual({
    kind: "issue",
    message: "JSON object required.",
  });
});

test("string wire stores source text without parsing", () => {
  expect(formatCode("const x = 1;", false)).toBe("const x = 1;");
  expect(parseCode("const x = 1;", false)).toEqual({
    kind: "value",
    data: "const x = 1;",
  });
  expect(parseCode("", false)).toEqual({ kind: "value", data: "" });
});
