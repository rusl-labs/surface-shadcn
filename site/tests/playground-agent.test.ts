import { describe, expect, test } from "bun:test";
import { createPlaygroundController } from "../src/playground-state";
import { registerPlaygroundTools, type ModelContext, type PlaygroundTool } from "../src/playground-tools";

const seed = {
  schema: JSON.stringify({ $id: "https://example.test/event", type: "object", properties: { title: { type: "string" } } }),
  annotation: JSON.stringify({ subject: "https://example.test/event", views: { default: { fields: [{ name: "title" }] } } }),
  data: JSON.stringify({ title: "Before" }),
};
const create = () => createPlaygroundController(seed);

describe("shared playground state", () => {
  test("agent writes update editor, preview, and revision together", () => {
    const controller = create();
    const result = controller.updateWorkspace({ expectedRevision: 0, documents: { data: { title: "After" } } });
    expect(result.ok).toBe(true);
    expect(controller.readWorkspace().documents.data).toEqual({ title: "After" });
    expect(JSON.parse(controller.getSnapshot().drafts.data)).toEqual({ title: "After" });
    expect(controller.getSnapshot().revision).toBe(1);
  });
  test("human edits invalidate a stale agent revision", () => {
    const controller = create();
    controller.editDocument("data", '{"title":"Human"}');
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { data: {} } }).code).toBe("conflict");
    expect(controller.readWorkspace().documents.data).toEqual({ title: "Human" });
  });
  test("unfinished JSON is preserved and blocks even a current agent write", () => {
    const controller = create();
    controller.editDocument("annotation", "{");
    expect(controller.updateWorkspace({ expectedRevision: 1, documents: { data: {} } }).code).toBe("unapplied_draft");
    expect(controller.getSnapshot().drafts.annotation).toBe("{");
    expect(controller.readWorkspace().documents.data).toEqual({ title: "Before" });
  });
  test("schema id and annotation subject can change atomically", () => {
    const controller = create();
    const schema = { ...JSON.parse(seed.schema), $id: "https://example.test/renamed" };
    const annotation = { ...JSON.parse(seed.annotation), subject: schema.$id };
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { schema } }).ok).toBe(false);
    expect(controller.getSnapshot().revision).toBe(0);
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { schema, annotation } }).ok).toBe(true);
  });
  test("invalid annotation structures and invalid schema keywords are rejected", () => {
    const controller = create();
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { annotation: { subject: "https://example.test/event", views: { default: { fields: "bad" } } } } }).ok).toBe(false);
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { schema: { $id: "https://example.test/event", type: "bogus" } } }).ok).toBe(false);
  });
  test("null data is a valid editable document; validation is separate", () => {
    const controller = create();
    expect(controller.updateWorkspace({ expectedRevision: 0, documents: { data: null } }).ok).toBe(true);
    expect(controller.readWorkspace().documents.data).toBeNull();
  });
  test("preview changes are checked and undo restores edits with a new revision", () => {
    const controller = create();
    expect(controller.setPreview({ expectedPreviewRevision: 0, mode: "input", view: "missing" }).ok).toBe(false);
    expect(controller.setPreview({ expectedPreviewRevision: 0, mode: "input", view: "default" }).ok).toBe(true);
    controller.updateWorkspace({ expectedRevision: 0, documents: { data: { title: "After" } } });
    controller.undo();
    expect(controller.readWorkspace().documents.data).toEqual({ title: "Before" });
    expect(controller.getSnapshot().mode).toBe("input");
    expect(controller.getSnapshot().revision).toBe(2);
    expect(controller.getSnapshot().previewRevision).toBe(1);
    controller.undo();
    expect(controller.getSnapshot().revision).toBe(2);
    expect(controller.getSnapshot().previewRevision).toBe(2);
  });
  test("read results cannot mutate the workspace", () => {
    const controller = create();
    const read = controller.readWorkspace();
    (read.documents.data as { title: string }).title = "Mutation";
    expect(controller.readWorkspace().documents.data).toEqual({ title: "Before" });
  });
});

describe("explicit WebMCP registration", () => {
  test("binds operations, validates tool input, and unregisters only its tools", async () => {
    const tools = new Map<string, PlaygroundTool>();
    const context: ModelContext = {
      async registerTool(tool, options) {
        tools.set(tool.name, tool);
        options.signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
    };
    const controller = create();
    const statuses: string[] = [];
    const dispose = registerPlaygroundTools({ ...controller, validateWorkspace: async () => ({ valid: true }), getGuidance: () => ({ text: "Guide" }) }, {
      context, onStatus: state => statuses.push(state.status),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(tools.size).toBe(5);
    expect(statuses.at(-1)).toBe("available");
    const write = tools.get("surface_playground_update_workspace")!;
    expect(await write.execute({ documents: { data: {} } })).toMatchObject({ ok: false, code: "invalid_arguments" });
    expect(await write.execute({ expectedRevision: 0, documents: { data: { title: "Tool" } } })).toMatchObject({ ok: true });
    expect(controller.readWorkspace().documents.data).toEqual({ title: "Tool" });
    dispose();
    expect(tools.size).toBe(0);
  });
  test("unsupported browsers retain normal editing", () => {
    const controller = create();
    const statuses: string[] = [];
    const dispose = registerPlaygroundTools({ ...controller, validateWorkspace: async () => ({}), getGuidance: () => ({}) }, { context: null, onStatus: state => statuses.push(state.status) });
    expect(statuses).toEqual(["unavailable"]);
    controller.editDocument("data", "null");
    expect(controller.readWorkspace().documents.data).toBeNull();
    dispose();
  });
  test("registration failures roll back partially registered tools", async () => {
    const tools = new Set<string>();
    let count = 0;
    const context: ModelContext = { async registerTool(tool, options) {
      if (++count === 2) throw new Error("duplicate tool name");
      tools.add(tool.name);
      options.signal.addEventListener("abort", () => tools.delete(tool.name));
    } };
    const statuses: string[] = [];
    registerPlaygroundTools({ ...create(), validateWorkspace: async () => ({}), getGuidance: () => ({}) }, { context, onStatus: state => statuses.push(state.status) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(tools.size).toBe(0);
    expect(statuses.at(-1)).toBe("error");
  });
});
