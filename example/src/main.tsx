import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../../registry/surface/kit";
import {
  demoSelection,
  SchemaSource,
  type SchemaSelection,
} from "./schema-source";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import contactAnnotation from "./contact.annotation.json";
import "./styles.css";

const initialData = {
  name: "Alex Morgan",
  email: "alex@example.com",
  relationship: "Partner",
  updates: true,
  location: { city: "Melbourne", timezone: "Australia/Sydney" },
  tags: ["Design partner"],
  notes: "Working together on the next good thing.",
};

function SchemaEditor({ selection }: { selection: SchemaSelection }) {
  const [{ Surface }] = useState(() =>
    createSurfaceUi({
      schemaResolver: selection.resolver,
      annotationResolver: new InMemoryAnnotationResolver({
        [contactAnnotation.subject]: contactAnnotation,
      }),
      validator: createAjvValidator(),
      kit: createShadcnKit(),
    }),
  );
  const [initial] = useState(() => {
    if (selection.isDemo) return initialData;
    const examples = selection.schema.examples;
    return Array.isArray(examples) && examples.length > 0
      ? structuredClone(examples[0])
      : structuredClone(selection.schema.default);
  });
  const [draft, setDraft] = useState<unknown>(initial);
  const [saved, setSaved] = useState<unknown>(initial);
  const [saveCount, setSaveCount] = useState(0);

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Edit {selection.title}</CardTitle>
          <CardDescription>
            {selection.isDemo
              ? "Fields and sections are selected by an annotation."
              : "Schema defaults, rendered with your local components."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Surface
            id={selection.id}
            data={draft}
            onChange={setDraft}
            onSubmit={({ data }) => {
              setSaved(data);
              setSaveCount((count) => count + 1);
            }}
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Live display</CardTitle>
              <Badge variant="secondary">Same schema</Badge>
            </div>
            <CardDescription>
              Changes appear here before you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Surface id={selection.id} data={draft} mode="display" />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Saved record</h2>
            <span role="status" className="text-xs text-muted-foreground">
              {saveCount === 0
                ? "No changes saved"
                : `${saveCount} successful ${saveCount === 1 ? "save" : "saves"}`}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only valid data reaches the submit callback. Reset returns to the
            initial data for this schema.
          </p>
          <Separator />
          <pre
            aria-label="Saved JSON"
            className="overflow-auto text-xs leading-relaxed"
          >
            {saved === undefined
              ? "No data yet"
              : JSON.stringify(saved, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [selection, setSelection] = useState(demoSelection);
  const [revision, setRevision] = useState(0);
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="font-semibold tracking-tight">
            surface<span className="text-muted-foreground"> / shadcn</span>
          </a>
          <Badge variant="outline">Local components. Shared behavior.</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-10 flex flex-col gap-4 md:max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            01 / Schema workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            One record.
            <br />
            Two ways to work.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Load a schema, edit its data, and read the same draft alongside it.
            Your components own the presentation; Surface connects the rest.
          </p>
        </div>
        <SchemaSource
          selection={selection}
          onChange={(next) => {
            setSelection(next);
            setRevision((value) => value + 1);
          }}
        />
        <SchemaEditor key={revision} selection={selection} />
        <footer className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <p>
            The accent edge on every text input comes from this app's local
            Input.
          </p>
          <p>React 19 · Tailwind 4 · Base UI / Nova</p>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
