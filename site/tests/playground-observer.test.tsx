import { afterEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createSurfaceUi, useSurface, type SurfaceKit, type Schema } from "@rusl-labs/surface";
import { createObservedPreview, createRenderObservation } from "../src/playground-observer";

if (!globalThis.document) GlobalRegistrator.register();
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; host?.remove(); });
function setup() { host = document.createElement("div"); document.body.append(host); root = createRoot(host); }
const identity = (revision = 0) => ({ revision, previewRevision: 0, mode: "input", view: "default" });
const schema: Schema = { $id: "https://example.test/observed", type: "string" };
function Input() {
  const { data } = useSurface();
  return <input aria-label="Observed input" value={String(data ?? "")} readOnly />;
}
const Fallback = () => <p>Fallback</p>;
const kit: SurfaceKit = { resolveRenderer: () => Input, fallback: Fallback };
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); };

test("a fresh report never claims parsed documents rendered", () => {
  const report = createRenderObservation(identity()).getSnapshot();
  expect(report.status).toBe("not-observed");
  expect(report.mountedNodes).toBe(0);
});

test("commits are revision tagged, renderer identity/focus survives updates, StrictMode cleanup removes mounts", async () => {
  setup();
  const observed = createObservedPreview(kit, { resolveSchema: async () => schema });
  const { Surface } = createSurfaceUi({ kit: observed.kit, schemaResolver: observed.schemaResolver });
  const first = createRenderObservation(identity());
  const second = createRenderObservation(identity(1));
  const tree = (observation: typeof first, data: string) => <StrictMode><observed.Provider observation={observation}><Surface id={schema.$id as string} mode="input" data={data} /></observed.Provider></StrictMode>;
  await act(async () => root!.render(tree(first, "Before")));
  await settle();
  const input = host.querySelector("input")!;
  expect(input).toBeTruthy(); input.focus();
  expect(first.getSnapshot()).toMatchObject({ status: "observed", revision: 0, mountedNodes: 1 });
  await act(async () => root!.render(tree(second, "After")));
  await settle();
  expect(host.querySelector("input")).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("After");
  expect(second.getSnapshot()).toMatchObject({ status: "observed", revision: 1, mountedNodes: 1 });
  expect(first.getSnapshot().mountedNodes).toBe(0);
  await act(async () => root!.unmount()); root = undefined;
  expect(second.getSnapshot().mountedNodes).toBe(0);
});

test("committed fallback renderer is an error, not normal rendering", async () => {
  setup();
  const observed = createObservedPreview({ ...kit, resolveRenderer: () => undefined }, { resolveSchema: async () => schema });
  const { Surface } = createSurfaceUi({ kit: observed.kit, schemaResolver: observed.schemaResolver });
  const observation = createRenderObservation(identity());
  await act(async () => root!.render(<observed.Provider observation={observation}><Surface id={schema.$id as string} /></observed.Provider>));
  await settle();
  expect(observation.getSnapshot().status).toBe("error");
  expect(observation.getSnapshot().diagnostics[0]).toMatchObject({ source: "render", category: "render", code: "fallback_renderer", path: "" });
});

test("resolver failures are observed even when core never mounts a fallback", async () => {
  setup();
  const observed = createObservedPreview(kit, { resolveSchema: async () => undefined });
  const { Surface } = createSurfaceUi({ kit: observed.kit, schemaResolver: observed.schemaResolver });
  const observation = createRenderObservation(identity());
  await act(async () => root!.render(<observed.Provider observation={observation}><Surface id={schema.$id as string} /></observed.Provider>));
  await settle();
  expect(observation.getSnapshot()).toMatchObject({ status: "error", mountedNodes: 0 });
  expect(observation.getSnapshot().diagnostics[0]).toMatchObject({ category: "reference", code: "resolver_failure", path: schema.$id });
});

test("a late failed resolver from the old generation cannot poison the new report", async () => {
  setup();
  let finishOld!: (value: Schema | undefined) => void;
  const observed = createObservedPreview(kit, { resolveSchema: uri => uri.endsWith("old") ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve(schema) });
  const { Surface } = createSurfaceUi({ kit: observed.kit, schemaResolver: observed.schemaResolver });
  const old = createRenderObservation(identity());
  const current = createRenderObservation(identity(1));
  await act(async () => root!.render(<observed.Provider observation={old}><Surface id="https://example.test/old" /></observed.Provider>));
  expect(old.getSnapshot().status).toBe("loading");
  await act(async () => root!.render(<observed.Provider observation={current}><Surface id={schema.$id as string} /></observed.Provider>));
  await settle();
  await act(async () => finishOld(undefined));
  await settle();
  expect(old.getSnapshot().status).toBe("error");
  expect(current.getSnapshot()).toMatchObject({ status: "observed", revision: 1, diagnostics: [] });
});
