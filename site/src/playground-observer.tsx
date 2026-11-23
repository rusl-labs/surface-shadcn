import { createContext, useContext, useEffect, useId, useLayoutEffect, type ReactNode } from "react";
import { useSurface, type SchemaResolver, type SurfaceKit, type SurfaceRenderer } from "@rusl-labs/surface";
import type { Diagnostic } from "./playground-diagnostics";

export interface PreviewIdentity { revision: number; previewRevision: number; mode: string; view: string }
interface NodeObservation {
  id?: string;
  path: string;
  coordinate?: { readonly subject: string; readonly path: readonly string[] };
  root: boolean;
  renderer: string;
  fallback: boolean;
}
export interface RenderReport extends PreviewIdentity {
  status: "not-observed" | "loading" | "observed" | "error";
  mountedNodes: number;
  nodes: NodeObservation[];
  pendingRequests: number;
  diagnostics: Diagnostic[];
  coverage: string;
}
const coverage = "Committed kit renderers and schema-resolver calls for this preview generation. Observed does not mean every expected field rendered. Core can return null before a renderer mounts; inspect definition/reference validation too.";

/** One generation. Late events from older generations cannot alter the current report. */
export function createRenderObservation(identity: PreviewIdentity) {
  const nodes = new Map<string, NodeObservation>();
  const requests = new Map<symbol, string>();
  const failures = new Map<string, Diagnostic>();
  const listeners = new Set<() => void>();
  let snapshot: RenderReport = { ...identity, status: "not-observed", mountedNodes: 0, nodes: [], pendingRequests: 0, diagnostics: [], coverage };
  let scheduled = false;
  function publish() {
    const values = [...nodes.values()];
    const diagnostics = [...failures.values(), ...values.filter(node => node.fallback).map(node => ({
      category: "render" as const, source: "render" as const, severity: "error" as const, code: "fallback_renderer", path: node.path,
      message: `The kit fallback renderer committed for ${node.id ?? node.path}. No normal renderer was selected.`,
    }))];
    snapshot = {
      ...identity, status: diagnostics.some(issue => issue.severity === "error") ? "error" : requests.size ? "loading" : values.length ? "observed" : "not-observed",
      mountedNodes: values.length, nodes: values.slice(0, 100), pendingRequests: requests.size, diagnostics, coverage,
    };
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => { scheduled = false; for (const listener of listeners) listener(); });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    mount(key: string, node: NodeObservation) {
      nodes.set(key, node); publish();
      return () => { nodes.delete(key); publish(); };
    },
    beginRequest(uri: string) {
      const key = Symbol(uri);
      requests.set(key, uri); publish();
      return (error?: string) => {
        requests.delete(key);
        if (error) failures.set(uri, { category: "reference", source: "render", severity: "error", code: "resolver_failure", path: uri, message: error });
        else failures.delete(uri);
        publish();
      };
    },
    exception(message: string) {
      failures.set("exception", { category: "render", source: "render", severity: "error", code: "render_exception", path: "", message });
      publish();
    },
  };
}
export type RenderObservation = ReturnType<typeof createRenderObservation>;
const ObservationContext = createContext<RenderObservation | null>(null);

/** Stable wrappers per renderer: report changes never remount the input control. */
export function createObservedPreview(kit: SurfaceKit, resolver: SchemaResolver) {
  let active: RenderObservation | null = null;
  const normalWrappers = new Map<SurfaceRenderer, SurfaceRenderer>();
  const fallbackWrappers = new Map<SurfaceRenderer, SurfaceRenderer>();
  function wrap(Renderer: SurfaceRenderer, fallback: boolean): SurfaceRenderer {
    const cache = fallback ? fallbackWrappers : normalWrappers;
    const existing = cache.get(Renderer);
    if (existing) return existing;
    const ObservedRenderer: SurfaceRenderer = props => {
      const observation = useContext(ObservationContext);
      const context = useSurface();
      const key = useId();
      const details = JSON.stringify({
        id: context.id,
        path: (context.dataPath ?? []).map(part => `/${String(part).replace(/~/g, "~0").replace(/\//g, "~1")}`).join(""),
        coordinate: context.coordinate, root: context.isRoot,
        renderer: Renderer.displayName ?? Renderer.name ?? "anonymous", fallback,
      } satisfies NodeObservation);
      useEffect(() => observation?.mount(key, JSON.parse(details)), [observation, key, details]);
      return <Renderer {...props} />;
    };
    ObservedRenderer.displayName = `Observed(${Renderer.displayName ?? Renderer.name ?? "Renderer"})`;
    cache.set(Renderer, ObservedRenderer);
    return ObservedRenderer;
  }
  async function resolve(uri: string, document: boolean) {
    const finish = active?.beginRequest(uri);
    try {
      const result = await (document && resolver.resolveDocument ? resolver.resolveDocument(uri) : resolver.resolveSchema(uri));
      finish?.(result ? undefined : "Schema resolver returned no document. Core may omit this node before invoking the kit fallback.");
      return result;
    } catch (cause) { finish?.(String(cause)); throw cause; }
  }
  function Provider({ observation, children }: { observation: RenderObservation; children: ReactNode }) {
    // Activated before core's passive resolution effects. Don't mutate during render.
    useLayoutEffect(() => {
      active = observation;
      return () => { if (active === observation) active = null; };
    }, [observation]);
    return <ObservationContext.Provider value={observation}>{children}</ObservationContext.Provider>;
  }
  return {
    Provider,
    schemaResolver: { resolveSchema: (uri: string) => resolve(uri, false), resolveDocument: (uri: string) => resolve(uri, true) } satisfies SchemaResolver,
    kit: {
      ...kit,
      resolveRenderer(request) {
        const Renderer = kit.resolveRenderer(request);
        return Renderer ? wrap(Renderer, Renderer === kit.fallback) : undefined;
      },
      fallback: wrap(kit.fallback, true),
    } satisfies SurfaceKit,
  };
}
