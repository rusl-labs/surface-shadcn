import { Component, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, useRef, type CSSProperties, type ReactNode } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { EditorView } from "@codemirror/view";
import {
  createSurfaceUi, InMemoryAnnotationResolver, InMemorySchemaFetchResolver,
  type AnnotationDocument, type Schema,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import schema from "./examples/event.schema.json";
import annotation from "./examples/event.annotation.json";
import { eventSample } from "./examples/event-views";
import { createPlaygroundController, documentNames, formatDocument as format, parseDocuments, type PreviewMode } from "./playground-state";
import { registerPlaygroundTools, type ToolStatus } from "./playground-tools";
import agentGuide from "../public/llms.txt?raw";
import { PlaygroundSaves } from "./playground-saves";
import { validateDocuments, type Checks } from "./playground-diagnostics";
import { createObservedPreview, createRenderObservation } from "./playground-observer";
import { getPlaygroundGuidance } from "./playground-guidance";
import { SESSION_KEY, deserializeWorkspace, readWorkspaceContent, serializeWorkspace } from "./playground-storage";
// Start with one full view; the document is small enough to explore immediately.
const seed = {
  schema: format(schema),
  annotation: format({
    $kind: annotation.$kind,
    subject: annotation.subject,
    views: { default: annotation.views.default },
  }),
  data: format(eventSample),
};

// Same 4px module as the page: equal-width panels, 16px padding, 24px gap.
const extensions = [
  loadLanguage("json")!,
  EditorView.lineWrapping,
  EditorView.theme({
    "&": { backgroundColor: "transparent", color: "var(--foreground)" },
    ".cm-content": { fontFamily: "var(--font-mono, monospace)" },
    ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted-foreground)", border: "none" },
    "&.cm-focused": { outline: "none" },
  }),
];

class PreviewBoundary extends Component<{ resetKey: string; onError: (message: string) => void; children: ReactNode }, { error: string | null; resetKey: string }> {
  state = { error: null as string | null, resetKey: this.props.resetKey };
  static getDerivedStateFromProps(props: { resetKey: string }, state: { resetKey: string }) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() {
    return this.state.error
      ? <p role="alert" className="text-sm text-destructive">Preview could not render: {this.state.error}. Update the JSON to retry.</p>
      : this.props.children;
  }
}

export function Playground({ expanded = false }: { expanded?: boolean }) {
  const [boot] = useState(() => {
    const controller = createPlaygroundController(seed);
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) controller.restore(deserializeWorkspace(stored));
      return { controller, error: null as string | null };
    } catch (cause) {
      return { controller, error: `Could not restore this tab's workspace: ${String(cause)}` };
    }
  });
  const { controller } = boot;
  const [storageError, setStorageError] = useState(boot.error);
  const [editorWidth, setEditorWidth] = useState(50);
  const splitRoot = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const { drafts, applied, error, mode, view } = state;
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, serializeWorkspace(state)); }
    catch (cause) { setStorageError(`Could not preserve this tab's workspace: ${String(cause)}`); }
  }, [state]);
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [toolStatus, setToolStatus] = useState<ToolStatus>({ status: "registering", message: "Checking WebMCP support…" });

  const parsed = useMemo(() => parseDocuments(applied), [applied]);
  // Data/report edits do not rebuild the registry, change renderer identity, or lose focus.
  const { Surface, Provider } = useMemo(() => {
    const currentSchema = JSON.parse(applied.schema) as Schema;
    const currentAnnotation = JSON.parse(applied.annotation) as AnnotationDocument;
    const observed = createObservedPreview(createShadcnKit(), new InMemorySchemaFetchResolver({ ...shadcnSchemas, [currentSchema.$id as string]: currentSchema }));
    return { ...createSurfaceUi({
      schemaResolver: observed.schemaResolver,
      annotationResolver: new InMemoryAnnotationResolver({ [currentAnnotation.subject]: currentAnnotation }),
      validator: createAjvValidator(), kit: observed.kit,
    }), Provider: observed.Provider };
  }, [applied.schema, applied.annotation]);
  const observation = useMemo(() => createRenderObservation({ revision: state.revision, previewRevision: state.previewRevision, mode, view }), [state.revision, state.previewRevision, mode, view]);
  const renderReport = useSyncExternalStore(observation.subscribe, observation.getSnapshot, observation.getSnapshot);
  const [validation, setValidation] = useState<{ revision: number; checks: Checks } | null>(null);
  const reports = useRef({ observation, validation });
  useLayoutEffect(() => { reports.current = { observation, validation }; }, [observation, validation]);
  const validateCurrent = useMemo(() => async () => {
    const snapshot = controller.getSnapshot();
    const current = parseDocuments(snapshot.applied).schema;
    const checks = await validateDocuments(snapshot.drafts, new InMemorySchemaFetchResolver({ ...shadcnSchemas, [current.$id as string]: current }));
    return { revision: snapshot.revision, checks };
  }, [controller]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { void validateCurrent().then(result => {
      if (!cancelled && result.revision === controller.getSnapshot().revision) setValidation(result);
    }); }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [controller, state.revision, validateCurrent]);

  useEffect(() => {
    if (!toolsEnabled) {
      setToolStatus({ status: "unavailable", message: "Agent tools paused. Manual editing is still available." });
      return;
    }
    const readRender = () => {
      const report = reports.current.observation.getSnapshot();
      const snapshot = controller.getSnapshot();
      return { ...report, stale: report.revision !== snapshot.revision || report.previewRevision !== snapshot.previewRevision, documentScope: "Applied documents (not unfinished editor drafts)" };
    };
    // Explicit registration, bound to this page—not to Surface.
    return registerPlaygroundTools({
      readWorkspace: input => {
        const workspace = controller.readWorkspace(input);
        const checked = reports.current.validation;
        return { ...workspace, render: readRender(), validation: checked ? { ...checked, stale: checked.revision !== workspace.revision, documentScope: "Editor drafts" } : { status: "not-run" } };
      },
      updateWorkspace: controller.updateWorkspace,
      setPreview: controller.setPreview,
      validateWorkspace: async () => {
        const previewRevision = controller.getSnapshot().previewRevision;
        const result = await validateCurrent();
        const now = controller.getSnapshot();
        return { ...result, previewRevision, stale: now.revision !== result.revision || now.previewRevision !== previewRevision, documentScope: "Editor drafts", render: readRender() };
      },
      getGuidance: input => getPlaygroundGuidance(input, agentGuide),
    }, { onStatus: setToolStatus });
  }, [controller, toolsEnabled, validateCurrent]);
  const views = [...new Set(["default", ...Object.keys(parsed.annotation.views ?? {})])];
  const workspace = useMemo(() => controller.readWorkspace(), [controller, state]);
  const checks = validation?.revision === state.revision ? validation.checks : undefined;
  const diagnostics = [...workspace.diagnostics, ...renderReport.diagnostics, ...Object.values(checks ?? {}).flatMap(check => check.issues)]
    .filter((issue, index, all) => all.findIndex(other => JSON.stringify(other) === JSON.stringify(issue)) === index);

  return <div ref={splitRoot} className={`grid min-w-0 gap-4 ${expanded ? "lg:grid-cols-[minmax(0,var(--editor-width))_0.5rem_minmax(0,1fr)]" : "lg:grid-cols-2"}`}
    style={{ "--editor-width": `${editorWidth}%` } as CSSProperties} data-playground>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/90 p-4 lg:col-span-full">
      <div className="grid gap-1">
        <p role="status" className="text-sm" data-agent-status={toolStatus.status}>{toolStatus.message}</p>
        <p className="text-xs text-muted-foreground">Documents {state.revision} · Preview {state.previewRevision} · {state.activity[0] ?? "Local workspace; nothing is published."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!expanded && <a className="inline-flex items-center px-3 text-sm font-medium underline underline-offset-4" href={`${import.meta.env.BASE_URL}playground/`}>Open workspace ↗</a>}
        <Button size="sm" variant="outline" disabled={!state.canUndo} onClick={() => controller.undo()}>Undo</Button>
        <Button size="sm" variant="ghost" onClick={() => setToolsEnabled(value => !value)}>
          {toolsEnabled ? "Pause agent tools" : "Enable agent tools"}
        </Button>
      </div>
    </div>
    {storageError && <p role="alert" className="text-sm text-destructive lg:col-span-full">{storageError}</p>}
    {expanded && <div className="lg:col-span-full"><PlaygroundSaves read={() => readWorkspaceContent(controller.getSnapshot())} load={controller.restore} /></div>}
    <div className="min-w-0 overflow-hidden rounded-xl border bg-background">
      <Tabs defaultValue="schema" className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4">
          <TabsList variant="line">
            {documentNames.map(name => <TabsTrigger key={name} value={name} className="capitalize">{name}</TabsTrigger>)}
          </TabsList>
          <Button size="sm" variant="ghost" onClick={() => controller.reset()}>Reset example</Button>
        </div>
        {documentNames.map(name => <TabsContent key={name} value={name}>
          <CodeMirror value={drafts[name]} height={expanded ? "max(400px, calc(100dvh - 23rem))" : "480px"}
            extensions={[...extensions, EditorView.contentAttributes.of({ "aria-label": `Playground ${name} JSON` })]}
            aria-label={`Playground ${name} JSON`} basicSetup={{ foldGutter: true }}
            onChange={value => controller.editDocument(name, value)} />
        </TabsContent>)}
      </Tabs>
      <p role={error ? "alert" : "status"} className={`border-t p-4 text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error ? `${error} Showing the last valid preview.` : "Changes preview automatically. Edit the JSON or try input mode."}
      </p>
    </div>
    {expanded && <div role="separator" aria-label="Resize editor and preview" aria-orientation="vertical"
      aria-valuemin={30} aria-valuemax={70} aria-valuenow={editorWidth} tabIndex={0}
      className="hidden cursor-col-resize touch-none rounded-full bg-border/60 outline-offset-4 hover:bg-primary/40 focus-visible:outline lg:block"
      onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const rect = splitRoot.current!.getBoundingClientRect();
        setEditorWidth(Math.round(Math.max(30, Math.min(70, (event.clientX - rect.left) / rect.width * 100))));
      }}
      onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault(); setEditorWidth(value => Math.max(30, Math.min(70, value + (event.key === "ArrowLeft" ? -2 : 2))));
      }} />}
    <div className="min-w-0 rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-4 border-b p-4">
        <label className="flex items-center gap-2 text-sm">Mode
          <select aria-label="Playground mode" className="rounded-md border bg-background p-1.5" value={mode}
            onChange={event => controller.selectPreview(event.target.value as PreviewMode, view)}>
            <option value="display">display</option><option value="input">input</option>
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">View
          <select aria-label="Playground view" className="min-w-0 max-w-48 rounded-md border bg-background p-1.5" value={view}
            onChange={event => controller.selectPreview(mode, event.target.value)}>
            {views.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className={`p-4 ${expanded ? "max-h-[max(400px,calc(100dvh-23rem))] overflow-auto" : ""}`} aria-label="Playground preview">
        <Provider observation={observation}>
          <PreviewBoundary resetKey={`${state.revision}/${state.previewRevision}`} onError={observation.exception}>
            <Surface id={parsed.schema.$id as string} mode={mode} view={view} data={parsed.data}
              onChange={data => controller.editDocument("data", format(data))} />
          </PreviewBoundary>
        </Provider>
      </div>
    </div>
    <section aria-label="Playground diagnostics" className="grid gap-2 rounded-xl border bg-background/90 p-4 text-sm lg:col-span-full">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-medium">Diagnostics</h3>
        <p className="text-xs text-muted-foreground">Documents {state.revision} · Preview {state.previewRevision}</p>
      </div>
      <p role="status" className="text-xs" data-render-status={renderReport.status}>
        Preview: {renderReport.status} · {renderReport.mountedNodes} mounted nodes{renderReport.pendingRequests ? ` · ${renderReport.pendingRequests} pending schema requests` : ""}. This is not proof that every expected field rendered.
      </p>
      <p className="text-xs text-muted-foreground" data-validation-status>
        {checks ? Object.entries(checks).map(([name, check]) => `${name}: ${check.status}`).join(" · ") : "Checking definitions, references, and data…"}
        {workspace.hasUnappliedDrafts && " Checks describe editor drafts; preview shows the last applied documents."}
      </p>
      {diagnostics.length > 0 && <details>
        <summary className="cursor-pointer text-xs font-medium">{diagnostics.filter(issue => issue.severity === "error").length} errors · {diagnostics.filter(issue => issue.severity === "warning").length} warnings · {diagnostics.filter(issue => issue.severity === "info").length} notes</summary>
        <ul className="mt-3 grid max-h-64 gap-3 overflow-auto text-xs">
          {diagnostics.map((issue, index) => <li key={index} className={issue.severity === "error" ? "text-destructive" : "text-muted-foreground"}>
            <p><strong>{issue.category} · {issue.source}</strong> <code className="break-all">{issue.document ?? "preview"}{issue.path || "/"}</code></p>
            <p>{issue.message}</p>
          </li>)}
        </ul>
      </details>}
    </section>
    <details className="rounded-xl border bg-background/90 p-4 text-sm lg:col-span-full">
      <summary className="cursor-pointer font-medium">Connect an agent</summary>
      <div className="mt-3 grid gap-3 text-muted-foreground">
        <p>In supported Chrome, enable <code>chrome://flags/#enable-webmcp-testing</code> and relaunch. Use HTTPS or localhost; plain HTTP on a LAN address is not a secure context.</p>
        <p>Ask a compatible browser agent to discover the <code>surface_playground_*</code> WebMCP tools on this page and call <code>surface_playground_get_guidance</code> first. Availability does not mean an agent is connected.</p>
        <p>Tools can read and change this workspace only. Writes are revision-checked, unfinished JSON is protected, and Undo works for agent changes. Referenced schemas may be fetched by URL. Pause unregisters the tools.</p>
      </div>
    </details>
  </div>;
}
