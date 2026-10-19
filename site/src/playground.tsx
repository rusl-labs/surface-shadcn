import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { EditorView } from "@codemirror/view";
import {
  createSurfaceUi, InMemoryAnnotationResolver, InMemorySchemaFetchResolver,
  type AnnotationDocument, type Schema, type SurfaceMode,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { isRecord, shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import schema from "./examples/event.schema.json";
import annotation from "./examples/event.annotation.json";
import { eventSample } from "./examples/event-views";

const format = (value: unknown) => JSON.stringify(value, null, 2);
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
type Documents = typeof seed;
type DocumentName = keyof Documents;
const documentNames: DocumentName[] = ["schema", "annotation", "data"];

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

function parseDocuments(documents: Documents) {
  const parsed: Record<DocumentName, unknown> = { schema: null, annotation: null, data: null };
  for (const name of documentNames) {
    try { parsed[name] = JSON.parse(documents[name]); }
    catch (error) { throw new Error(`${name}: ${error instanceof Error ? error.message : "Invalid JSON"}`); }
  }
  if (!isRecord(parsed.schema) || typeof parsed.schema.$id !== "string" || !parsed.schema.$id.trim()) {
    throw new Error("Schema must be an object with a non-empty $id.");
  }
  if (!isRecord(parsed.annotation) || !isRecord(parsed.annotation.views)) {
    throw new Error("Annotation must be an object with a views object.");
  }
  if (parsed.annotation.subject !== parsed.schema.$id) {
    throw new Error("Annotation subject must match the schema $id.");
  }
  for (const [name, view] of Object.entries(parsed.annotation.views)) {
    if (!isRecord(view) || (view.fields !== undefined && !Array.isArray(view.fields))) {
      throw new Error(`Annotation view "${name}" must be an object with an optional fields array.`);
    }
  }
  return { schema: parsed.schema as Schema, annotation: parsed.annotation as unknown as AnnotationDocument, data: parsed.data };
}

class PreviewBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: string | null; resetKey: string }> {
  state = { error: null as string | null, resetKey: this.props.resetKey };
  static getDerivedStateFromProps(props: { resetKey: string }, state: { resetKey: string }) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() {
    return this.state.error
      ? <p role="alert" className="text-sm text-destructive">Preview could not render: {this.state.error}. Update the JSON to retry.</p>
      : this.props.children;
  }
}

export function Playground() {
  const [drafts, setDrafts] = useState<Documents>(seed);
  const [applied, setApplied] = useState<Documents>(seed);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SurfaceMode>("display");
  const [selectedView, setSelectedView] = useState("default");

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        parseDocuments(drafts);
        setApplied(drafts);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [drafts]);

  const parsed = useMemo(() => parseDocuments(applied), [applied]);
  // Data edits do not rebuild the registry or remount the input form.
  const { Surface } = useMemo(() => {
    const currentSchema = JSON.parse(applied.schema) as Schema;
    const currentAnnotation = JSON.parse(applied.annotation) as AnnotationDocument;
    return createSurfaceUi({
      schemaResolver: new InMemorySchemaFetchResolver({ ...shadcnSchemas, [currentSchema.$id as string]: currentSchema }),
      annotationResolver: new InMemoryAnnotationResolver({ [currentAnnotation.subject]: currentAnnotation }),
      validator: createAjvValidator(),
      kit: createShadcnKit(),
    });
  }, [applied.schema, applied.annotation]);
  const views = [...new Set(["default", ...Object.keys(parsed.annotation.views ?? {})])];
  const view = views.includes(selectedView) ? selectedView : "default";

  return <div className="grid min-w-0 gap-6 lg:grid-cols-2" data-playground>
    <div className="min-w-0 overflow-hidden rounded-xl border">
      <Tabs defaultValue="schema" className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4">
          <TabsList variant="line">
            {documentNames.map(name => <TabsTrigger key={name} value={name} className="capitalize">{name}</TabsTrigger>)}
          </TabsList>
          <Button size="sm" variant="ghost" onClick={() => {
            setDrafts(seed); setApplied(seed); setError(null); setMode("display"); setSelectedView("default");
          }}>Reset example</Button>
        </div>
        {documentNames.map(name => <TabsContent key={name} value={name}>
          <CodeMirror value={drafts[name]} height="480px"
            extensions={[...extensions, EditorView.contentAttributes.of({ "aria-label": `Playground ${name} JSON` })]}
            aria-label={`Playground ${name} JSON`} basicSetup={{ foldGutter: true }}
            onChange={value => setDrafts(previous => ({ ...previous, [name]: value }))} />
        </TabsContent>)}
      </Tabs>
      <p role={error ? "alert" : "status"} className={`border-t p-4 text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error ? `${error} Showing the last valid preview.` : "Changes preview automatically. Edit the JSON or try input mode."}
      </p>
    </div>
    <div className="min-w-0 rounded-xl border">
      <div className="flex flex-wrap items-center gap-4 border-b p-4">
        <label className="flex items-center gap-2 text-sm">Mode
          <select aria-label="Playground mode" className="rounded-md border bg-background p-1.5" value={mode}
            onChange={event => setMode(event.target.value as SurfaceMode)}>
            <option value="display">display</option><option value="input">input</option>
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">View
          <select aria-label="Playground view" className="min-w-0 max-w-48 rounded-md border bg-background p-1.5" value={view}
            onChange={event => setSelectedView(event.target.value)}>
            {views.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="p-4" aria-label="Playground preview">
        <PreviewBoundary resetKey={JSON.stringify(applied) + mode + view}>
          <Surface id={parsed.schema.$id as string} mode={mode} view={view} data={parsed.data}
            onChange={data => {
              const text = format(data);
              setDrafts(previous => ({ ...previous, data: text }));
              setApplied(previous => ({ ...previous, data: text }));
            }} />
        </PreviewBoundary>
      </div>
    </div>
  </div>;
}
