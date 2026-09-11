import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
  candidateKeys,
  useSurface,
  type SurfaceRootProps,
  type AnnotationDocument,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { SurfaceProvider } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "../../registry/surface/kit";
import {
  demoSelection,
  SchemaSource,
  type SchemaSelection,
} from "./schema-source";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { annotationContext, exampleAnnotations } from "./view-annotations";
import { AnnotationEditor, ViewControls } from "./view-controls";
import "./styles.css";
const usAddressSample = {
  $kind: "https://resources.rusl.com/resources/pragmatic/schemas/us-address",
  street1: "1 Infinite Loop",
  street2: "Cupertino HQ",
  city: "Cupertino",
  region: "CA",
  postalCode: "95014",
  countryCode: "US",
};

const productSample = {
  name: "Laptop",
  sku: "MBP-14",
  status: "active",
  description: "Portable workstation.",
  images: [
    {
      url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=640&h=480&q=80",
      alt: "Open laptop on a desk",
    },
    {
      url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=640&h=480&q=80",
      alt: "Laptop from above",
    },
  ],
};

const initialData = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+14155550100",
  budget: { amount: 3423, currency: "USD" },
  relationship: "Partner",
  updates: true,
  location: { city: "Melbourne", timezone: "Australia/Sydney" },
  tags: ["Design partner"],
  notes: "Working together on the next good thing.",
};

function SchemaEditor({
  selection,
  annotation,
  onAnnotationChange,
}: {
  selection: SchemaSelection;
  annotation: AnnotationDocument;
  onAnnotationChange: (annotation: AnnotationDocument) => void;
}) {
  const [inputView, setInputView] = useState("default");
  const [displayView, setDisplayView] = useState("card");
  const { Surface } = useMemo(() => {
    const kit = createShadcnKit();
    const KitRoot = kit.Root!;
    function PlaygroundRoot(props: SurfaceRootProps) {
      const surface = useSurface();
      const mode = surface.mode ?? "input";
      const view = surface.view ?? "default";
      const schema = surface.schema!;
      return (
        <>
          <ViewControls
            context={annotationContext(
              {
                documentUri: surface.documentUri ?? selection.documentUri,
                pointer: surface.coordinate?.subject.split("#")[1] ?? "",
              },
              surface.annotation,
            )}
            mappedViews={
              kit.getViews?.({
                keys: candidateKeys(schema, surface.entry, surface.coordinate),
                schema,
                mode,
                view,
                entry: surface.entry,
                coordinate: surface.coordinate,
                data: surface.data,
              }) ?? []
            }
            mode={mode}
            view={view}
            onChange={mode === "input" ? setInputView : setDisplayView}
          />
          <KitRoot {...props} />
        </>
      );
    }
    return createSurfaceUi({
      schemaResolver: selection.resolver,
      annotationResolver: new InMemoryAnnotationResolver({
        ...exampleAnnotations,
        [selection.documentUri]: annotation,
      }),
      validator: createAjvValidator(),
      kit: { ...kit, Root: PlaygroundRoot },
    });
  }, [selection, annotation]);
  const [initial] = useState(() => {
    if (selection.isDemo) return initialData;
    const examples = selection.schema.examples;
    if (Array.isArray(examples) && examples.length > 0)
      return structuredClone(examples[0]);
    if (
      selection.documentUri ===
      "https://resources.rusl.com/resources/pragmatic/schemas/commerce.product"
    ) {
      return structuredClone(productSample);
    }
    if (
      selection.documentUri ===
      "https://resources.rusl.com/resources/pragmatic/schemas/us-address"
    ) {
      return structuredClone(usAddressSample);
    }
    return structuredClone(selection.schema.default);
  });
  const [draft, setDraft] = useState<unknown>(initial);
  const [saved, setSaved] = useState<unknown>(initial);
  const [saveCount, setSaveCount] = useState(0);

  return (
    <>
      <AnnotationEditor annotation={annotation} onApply={onAnnotationChange} />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Edit {selection.title}</CardTitle>
            <CardDescription>
              Choose a view defined by annotations or this schema's renderer
              mapping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Surface
              id={selection.id}
              view={inputView}
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
            <CardHeader>
              <CardTitle>Live display</CardTitle>
              <CardAction>
                <Badge variant="secondary">Same schema</Badge>
              </CardAction>
              <CardDescription>
                Changes appear here before you save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Surface
                id={selection.id}
                data={draft}
                mode="display"
                view={displayView}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Saved record</CardTitle>
              <CardAction>
                <span role="status" className="text-muted-foreground">
                  {saveCount === 0
                    ? "No changes saved"
                    : `${saveCount} successful ${saveCount === 1 ? "save" : "saves"}`}
                </span>
              </CardAction>
              <CardDescription>
                Only valid data reaches the submit callback. Reset returns to
                the initial data for this schema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre aria-label="Saved JSON" className="overflow-auto">
                {saved === undefined
                  ? "No data yet"
                  : JSON.stringify(saved, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function App() {
  const [selection, setSelection] = useState(demoSelection);
  const [revision, setRevision] = useState(0);
  const [annotations, setAnnotations] = useState(exampleAnnotations);
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="font-medium">
            surface<span className="text-muted-foreground"> / shadcn</span>
          </a>
          <a href="/how-it-works.html">How it works</a>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1>Schema workspace</h1>
          <p className="text-muted-foreground">
            Load a schema, edit its data, and read the same draft alongside it.
          </p>
        </div>
        <SchemaSource
          selection={selection}
          onChange={(next) => {
            setSelection(next);
            setRevision((value) => value + 1);
          }}
        />
        <SchemaEditor
          key={revision}
          selection={selection}
          annotation={
            annotations[selection.documentUri] ?? {
              subject: selection.documentUri,
            }
          }
          onAnnotationChange={(annotation) =>
            setAnnotations((current) => ({
              ...current,
              [selection.documentUri]: annotation,
            }))
          }
        />
        <footer className="border-t pt-6 text-muted-foreground">
          React 19 · Tailwind 4 · Base UI / Vega
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SurfaceProvider locale="en-AU" defaultCountry="AU" defaultCurrency="AUD">
      <App />
    </SurfaceProvider>
  </StrictMode>,
);
