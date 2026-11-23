import { expect, test } from "bun:test";
import { createPlaygroundController } from "../src/playground-state";
import { registerPlaygroundTools, type ModelContext, type PlaygroundTool } from "../src/playground-tools";

const schema = { $id: "https://example.test/contract", type: "object", properties: { title: { type: "string" } } };
const annotation = { subject: schema.$id, views: { default: { fields: [{ name: "title" }] } } };
const create = () => createPlaygroundController({ schema: JSON.stringify(schema), annotation: JSON.stringify(annotation), data: '{"title":"Before"}' });

test("workspace reads omit raw editor text unless includeDrafts is requested", () => {
  const controller = create();
  expect(controller.readWorkspace()).not.toHaveProperty("drafts");
  const expanded = Reflect.apply(controller.readWorkspace, controller, [{ includeDrafts: true }]);
  expect(expanded.drafts.data).toBe('{"title":"Before"}');
});

test("preview-only changes leave the document concurrency token valid", () => {
  const controller = create();
  const before = controller.readWorkspace();
  controller.selectPreview("input", "default");
  const result = controller.updateWorkspace({ expectedRevision: before.revision, documents: { data: { title: "After" } } });
  expect(result.ok).toBe(true);
  expect(controller.readWorkspace().preview.mode).toBe("input");
  expect(controller.readWorkspace()).toHaveProperty("previewRevision", 1);
});

test("an update can atomically define and select a new view", () => {
  const controller = create();
  const request = {
    expectedRevision: 0,
    expectedPreviewRevision: 0,
    documents: { annotation: { ...annotation, views: { ...annotation.views, compact: { fields: [{ name: "title", label: "" }] } } } },
    preview: { mode: "display", view: "compact" },
  };
  const result = controller.updateWorkspace(request);
  expect(result.ok).toBe(true);
  expect(controller.readWorkspace().preview.view).toBe("compact");
});

test("invalid atomic preview selection must not partially write documents", () => {
  const controller = create();
  const before = controller.readWorkspace();
  const request = {
    expectedRevision: 0, expectedPreviewRevision: 0,
    documents: { data: { title: "Must not apply" } },
    preview: { mode: "input", view: "not-registered" },
  };
  expect(controller.updateWorkspace(request).ok).toBe(false);
  expect(controller.readWorkspace()).toEqual(before);
});

test("stale preview token rejects a combined change without changing documents", () => {
  const controller = create();
  controller.selectPreview("input", "default");
  const before = controller.readWorkspace();
  const request = {
    expectedRevision: before.revision, expectedPreviewRevision: 0,
    documents: { data: { title: "Must not apply" } },
    preview: { mode: "display", view: "default" },
  };
  expect(controller.updateWorkspace(request).ok).toBe(false);
  expect(controller.readWorkspace()).toEqual(before);
});

async function registered() {
  const tools = new Map<string, PlaygroundTool>();
  const context: ModelContext = { async registerTool(tool, options) {
    tools.set(tool.name, tool);
    options.signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
  } };
  const guidanceRequests: unknown[] = [];
  const reads: unknown[] = [];
  const controller = create();
  const dispose = registerPlaygroundTools({
    ...controller,
    readWorkspace: (...args: unknown[]) => { reads.push(args[0]); return controller.readWorkspace(); },
    getGuidance: (...args: unknown[]) => { guidanceRequests.push(args[0]); return { received: args[0] }; },
    validateWorkspace: async () => ({}),
  }, { context });
  await new Promise(resolve => setTimeout(resolve, 0));
  return { tools, dispose, guidanceRequests, reads };
}

test("guidance tool accepts and forwards a focused separator topic", async () => {
  const registeredTools = await registered();
  try {
    const result = await registeredTools.tools.get("surface_playground_get_guidance")!.execute({ topic: "separators" });
    expect(result).not.toMatchObject({ code: "invalid_arguments" });
    expect(registeredTools.guidanceRequests).toEqual([{ topic: "separators" }]);
  } finally { registeredTools.dispose(); }
});

test("guidance tool accepts a widget-specific options request", async () => {
  const registeredTools = await registered();
  try {
    const result = await registeredTools.tools.get("surface_playground_get_guidance")!.execute({ topic: "widgets", widget: "email" });
    expect(result).not.toMatchObject({ code: "invalid_arguments" });
    expect(registeredTools.guidanceRequests).toEqual([{ topic: "widgets", widget: "email" }]);
  } finally { registeredTools.dispose(); }
});

test("read tool accepts the explicit includeDrafts option", async () => {
  const registeredTools = await registered();
  try {
    const result = await registeredTools.tools.get("surface_playground_read_workspace")!.execute({ includeDrafts: true });
    expect(result).not.toMatchObject({ code: "invalid_arguments" });
    expect(registeredTools.reads).toEqual([{ includeDrafts: true }]);
  } finally { registeredTools.dispose(); }
});
