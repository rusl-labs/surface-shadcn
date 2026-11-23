import { expect, test } from "bun:test";
import { createPlaygroundController } from "../src/playground-state";
import { deserializeWorkspace, readSavedProjects, serializeWorkspace } from "../src/playground-storage";

const documents = {
  schema: JSON.stringify({ $id: "https://example.test/form", type: "object" }),
  annotation: JSON.stringify({ subject: "https://example.test/form", views: { default: { label: "Form" } } }),
  data: "{}",
};
const content = { drafts: documents, applied: documents, mode: "display" as const, view: "default" };

test("workspace export/import round-trips without internal state", () => {
  const serialized = serializeWorkspace({ ...content, ...{ revision: 10 } });
  expect(deserializeWorkspace(serialized)).toEqual(content);
  expect(serialized).not.toContain("revision");
});
test("unfinished drafts survive save/load alongside last-valid applied documents", () => {
  const saved = { ...content, drafts: { ...documents, data: "{" } };
  const controller = createPlaygroundController(documents);
  controller.restore(deserializeWorkspace(serializeWorkspace(saved)));
  expect(controller.getSnapshot().drafts.data).toBe("{");
  expect(controller.getSnapshot().error).toContain("data:");
  expect(controller.readWorkspace().documents.data).toEqual({});
});
test("loading a saved project is undoable and invalidates agent revisions", () => {
  const controller = createPlaygroundController(documents);
  const changed = { ...documents, data: '{"loaded":true}' };
  controller.restore({ ...content, drafts: changed, applied: changed });
  expect(controller.updateWorkspace({ expectedRevision: 0, documents: { data: null } }).code).toBe("conflict");
  controller.undo();
  expect(controller.readWorkspace().documents.data).toEqual({});
});
test("unsupported versions and malformed saved documents fail without silently discarding storage", () => {
  expect(() => deserializeWorkspace('{"version":2}')).toThrow("Unsupported");
  expect(() => readSavedProjects('[{"version":2}]')).toThrow("Unsupported");
  expect(() => deserializeWorkspace(JSON.stringify({ version: 1, workspace: { ...content, applied: { ...documents, schema: "{" } } }))).toThrow();
});
test("saved-project list preserves named bundles", () => {
  const project = { version: 1, id: "test", name: "My form", updatedAt: "2026-10-19T00:00:00Z", workspace: content };
  expect(readSavedProjects(JSON.stringify([project]))).toEqual([project]);
  expect(readSavedProjects(null)).toEqual([]);
});
