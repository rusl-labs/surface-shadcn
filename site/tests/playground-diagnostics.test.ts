import { expect, test } from "bun:test";
import { InMemorySchemaFetchResolver } from "@rusl-labs/surface";
import { inspectDefinitions, inspectPresentation, validateDocuments } from "../src/playground-diagnostics";
import { getPlaygroundGuidance } from "../src/playground-guidance";
import { createPlaygroundController, formatDocument } from "../src/playground-state";

const id = "https://example.test/diagnostics";
const schema = { $id: id, type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1 } } };
const annotation = { subject: id, views: { default: { fields: [{ name: "name" }] } } };
const docs = (s: unknown = schema, a: unknown = annotation, data: unknown = {}) => ({ schema: formatDocument(s), annotation: formatDocument(a), data: formatDocument(data) });
const resolver = { resolveSchema: async () => undefined };

test("definitions are categorized independently and blocked checks are not-run", async () => {
  const result = await validateDocuments({ ...docs({ $id: id, type: "bogus" }, { subject: id, views: { default: { labelDisplay: "hidden" } } }), data: "{" }, resolver);
  expect(result.schema.status).toBe("invalid");
  expect(result.annotation.status).toBe("invalid");
  expect(result.annotation.issues.some(issue => issue.message.includes("still a proposal"))).toBe(true);
  expect(result.data.issues[0]).toMatchObject({ document: "data", code: "json", path: "" });
  expect(result.reference.status).toBe("not-run");
});

test.each([{}, { name: "" }])("missing form input is incomplete, not broken definitions (%j)", async data => {
  const result = await validateDocuments(docs(schema, annotation, data), resolver);
  expect(result.schema.status).toBe("valid");
  expect(result.annotation.status).toBe("valid");
  expect(result.reference.status).toBe("valid");
  expect(result.data.status).toBe("incomplete");
  expect(result.data.issues[0]).toMatchObject({ category: "data", code: "missing_input", path: "/name" });
});

test("invalid nonempty values and valid data are distinguished", async () => {
  expect((await validateDocuments(docs(schema, annotation, { name: 7 }), resolver)).data.status).toBe("invalid");
  expect((await validateDocuments(docs(schema, annotation, { name: "Alex" }), resolver)).data.status).toBe("valid");
});

test("a missing local ref is a reference failure even though documents are accepted", async () => {
  const broken = { ...schema, properties: { name: { $ref: "#/$defs/missing" } } };
  const documents = docs(broken);
  expect(createPlaygroundController(documents).readWorkspace().documents.schema).toEqual(broken);
  const result = await validateDocuments(documents, resolver);
  expect(result.schema.status).toBe("valid");
  expect(result.reference.status).toBe("invalid");
  expect(result.reference.issues[0]).toMatchObject({ category: "reference", path: `${id}#/$defs/missing` });
  expect(result.data.status).toBe("not-run");
});

test("external resolver failure and a missing external fragment remain reference issues", async () => {
  const external = "https://example.test/external";
  const documents = docs({ ...schema, properties: { name: { $ref: `${external}#/$defs/missing` } } });
  for (const resolveSchema of [async () => undefined, async () => ({ $id: external, $defs: {} })]) {
    const result = await validateDocuments(documents, { resolveSchema });
    expect(result.reference.status).toBe("invalid");
    expect(result.data.status).toBe("not-run");
  }
});

test("external definitions compile and validate without treating input errors as ref failures", async () => {
  const external = "https://example.test/external";
  const documents = docs({ ...schema, properties: { name: { $ref: `${external}#/$defs/name` } } });
  const result = await validateDocuments(documents, new InMemorySchemaFetchResolver({ [external]: { $id: external, $defs: { name: { type: "string" } } } }));
  expect(result.reference.status).toBe("valid");
  expect(result.data.status).toBe("incomplete");
});

test("unknown widgets, explicit hiding, and core-pruned sections have located definition advice", () => {
  const data = { schema, annotation: { subject: id, views: { default: { fields: [
    { name: "name", hidden: true, widget: { name: "does-not-exist" } },
    { label: "Gone", fields: [{ name: "missing", omit: true }] },
    { label: "", widget: { name: "separator" } },
  ] } } }, data: {} };
  const issues = inspectPresentation(data, "input", "default");
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "hidden", severity: "info", path: "/views/default/fields/0" }),
    expect.objectContaining({ code: "unsupported_widget", source: "definition", path: "/views/default/fields/0/widget" }),
    expect.objectContaining({ code: "pruned_section", path: "/views/default/fields/1" }),
  ]));
  expect(issues.some(issue => issue.path === "/views/default/fields/2")).toBe(false);
});

test("unsupported collection divider options produce actionable located advice", () => {
  const data = { schema: { $id: id, type: "object", properties: { rows: { type: "array", items: { type: "string" } } } }, annotation: { subject: id, views: { default: { fields: [{ name: "rows", widget: { name: "list", options: { separator: true } } }] } } }, data: {} };
  const issues = inspectPresentation(data, "display", "default");
  expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "widget_options", path: "/views/default/fields/0/widget/options/separator", message: expect.stringContaining("no built-in between-item") })]));
});

test("mode and named-view decoration use Surface's resolver", () => {
  const data = { schema, annotation: { subject: id, views: {
    default: { fields: [{ name: "name", hidden: true, input: { hidden: false } }] },
    compact: { fields: [{ name: "name" }] },
  } }, data: {} };
  expect(inspectPresentation(data, "input", "compact").some(issue => issue.code === "hidden")).toBe(false);
  expect(inspectPresentation(data, "display", "compact").some(issue => issue.code === "hidden")).toBe(true);
});

test("effective widget diagnostics point at mode overrides or the affected inherited field", () => {
  const data = { schema, annotation: { subject: id, views: {
    default: { fields: [{ name: "name", input: { widget: { name: "unknown-widget" } } }] },
    compact: { fields: [{ name: "name" }] },
  } }, data: {} };
  expect(inspectPresentation(data, "input", "default")[0]?.path).toBe("/views/default/fields/0/input/widget");
  expect(inspectPresentation(data, "input", "compact")[0]?.path).toBe("/views/compact/fields/0");
});

test("definition checks reject invented view label properties, keeping the last applied documents", () => {
  const controller = createPlaygroundController(docs());
  const result = controller.updateWorkspace({ expectedRevision: 0, documents: { annotation: { ...annotation, views: { default: { labelDisplay: "placeholder" } } } } });
  expect(result.ok).toBe(false);
  expect(controller.getSnapshot().revision).toBe(0);
  expect(inspectDefinitions(docs()).checks.data.status).toBe("not-run");
});

test("focused guidance reports implemented options and remaining limits", () => {
  const separators = getPlaygroundGuidance({ topic: "separators" }) as any;
  expect(separators.standalone).toEqual({ label: "", widget: { name: "separator" } });
  expect(separators.limitation).toContain("n−1");
  expect(separators.limitation).toContain("last");
  expect(JSON.stringify(getPlaygroundGuidance({ topic: "labels" }))).toContain("still a proposal");
  const email = getPlaygroundGuidance({ topic: "widgets", widget: "email" }) as any;
  expect(email.contract.properties.name.const).toBe("email");
  expect(email.contract.properties.options.properties).toHaveProperty("placeholder");
  expect(email).not.toHaveProperty("guide");
  expect(getPlaygroundGuidance({ topic: "bogus" })).toHaveProperty("topics");
  expect(getPlaygroundGuidance({ widget: "bogus" })).toHaveProperty("widgets");
});
