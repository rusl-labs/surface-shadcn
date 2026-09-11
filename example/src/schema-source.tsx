import { useEffect, useRef, useState } from "react";
import {
  InMemorySchemaFetchResolver,
  schemaAtUri,
  type Schema,
  type SchemaResolver,
} from "@rusl-labs/surface";
import { isRecord, shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import contactSchema from "./contact.schema.json";
import contactScalars from "../../schemas/pragmatic/contact.scalars.schema.json";

const examples = [
  ["Product", "commerce.product"],
  ["External reference", "external-reference"],
  ["Contact card", "contact.card"],
  ["US address", "us-address"],
  ["Money", "money"],
  ["Contact scalars", "contact.scalars"],
].map(([label, slug]) => ({
  label,
  url: `https://resources.rusl.com/resources/pragmatic/schemas/${slug}`,
}));

// Application navigation state; the schema itself remains Surface's Schema.
export interface SchemaSelection {
  document: Schema;
  documentUrl: string;
  documentUri: string;
  schema: Schema;
  id: string;
  pointer: string;
  url: string;
  title: string;
  resolver: SchemaResolver;
  choices: { pointer: string; label: string }[];
  isDemo: boolean;
}

function selectSchema(
  document: Schema,
  documentUrl: string,
  documentUri: string,
  resolver: SchemaResolver,
  requestedPointer?: string,
): SchemaSelection {
  const choices: SchemaSelection["choices"] = [];
  for (const keyword of ["$defs", "definitions"]) {
    const definitions = document[keyword];
    if (!isRecord(definitions)) continue;
    for (const [name, definition] of Object.entries(definitions)) {
      if (!isRecord(definition)) continue;
      choices.push({
        pointer: `/${keyword}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`,
        label:
          typeof definition.title === "string"
            ? `${definition.title} (${name})`
            : name,
      });
    }
  }
  const hasRoot =
    choices.length === 0 ||
    [
      "type",
      "properties",
      "$ref",
      "allOf",
      "anyOf",
      "oneOf",
      "items",
      "enum",
      "const",
    ].some((key) => key in document);
  if (hasRoot) choices.unshift({ pointer: "", label: "Document root" });
  const pointer = requestedPointer ?? choices[0].pointer;
  if (pointer !== "" && !pointer.startsWith("/")) {
    throw new Error(
      "Use a JSON Pointer fragment, such as #/$defs/email, rather than a named anchor.",
    );
  }
  const id = documentUri + (pointer ? `#${pointer}` : "");
  const schema = schemaAtUri(document, id);
  if (!schema) throw new Error(`No object-form schema exists at #${pointer}.`);
  if (!choices.some((choice) => choice.pointer === pointer)) {
    choices.push({ pointer, label: pointer || "Document root" });
  }
  const url = new URL(documentUrl);
  url.hash = pointer;
  return {
    document,
    documentUrl,
    documentUri,
    schema,
    id,
    pointer,
    url: url.href,
    resolver,
    choices,
    title:
      typeof schema.title === "string"
        ? schema.title
        : pointer || documentUrl.split("/").at(-1) || "Schema",
    isDemo: false,
  };
}

export const demoSelection: SchemaSelection = {
  document: contactSchema,
  documentUrl: contactSchema.$id,
  documentUri: contactSchema.$id,
  schema: contactSchema,
  id: contactSchema.$id,
  pointer: "",
  url: "",
  title: "Contact",
  resolver: new InMemorySchemaFetchResolver({
    ...shadcnSchemas,
    [contactSchema.$id]: contactSchema,
    [contactScalars.$id]: contactScalars,
  }),
  choices: [],
  isDemo: true,
};

export function SchemaSource({
  selection,
  onChange,
}: {
  selection: SchemaSelection;
  onChange: (selection: SchemaSelection) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const [schemaJson, setSchemaJson] = useState(() =>
    JSON.stringify(selection.document, null, 2),
  );
  const [jsonError, setJsonError] = useState("");
  useEffect(() => {
    setSchemaJson(JSON.stringify(selection.document, null, 2));
    setJsonError("");
  }, [selection.document]);

  function applySchemaJson() {
    try {
      const document: unknown = JSON.parse(schemaJson);
      if (!isRecord(document)) {
        throw new Error(
          "Surface needs a JSON Schema object, not an array, scalar, or boolean schema.",
        );
      }
      const base = "https://surface.local/playground/schema.json";
      const uri =
        typeof document.$id === "string"
          ? new URL(document.$id, base).href
          : base;
      const resolver = new InMemorySchemaFetchResolver({
        ...shadcnSchemas,
        [uri]: document,
      });
      const next = selectSchema(document, uri, uri, resolver);
      request.current++;
      commit(next);
      setJsonError("");
    } catch (cause) {
      setJsonError(
        cause instanceof Error ? cause.message : "Invalid schema JSON.",
      );
    }
  }

  function commit(next: SchemaSelection) {
    setUrl(next.url);
    setError("");
    setLoading(false);
    onChange(next);
  }

  async function load(rawUrl: string) {
    const ticket = ++request.current;
    setUrl(rawUrl);
    setLoading(true);
    setError("");
    try {
      const source = new URL(rawUrl.trim());
      if (source.protocol !== "https:" && source.protocol !== "http:") {
        throw new Error("Enter an absolute HTTP or HTTPS schema URL.");
      }
      const pointer = source.hash
        ? decodeURIComponent(source.hash.slice(1))
        : undefined;
      source.hash = "";
      const documentUrl = source.href;
      const fetched = await new InMemorySchemaFetchResolver(
        shadcnSchemas,
      ).resolveDocument(documentUrl);
      if (!isRecord(fetched))
        throw new Error(
          "Surface needs a JSON Schema object, not an array, scalar, or boolean schema.",
        );
      const documentUri =
        typeof fetched.$id === "string"
          ? new URL(fetched.$id, documentUrl).href
          : documentUrl;
      const resolver = new InMemorySchemaFetchResolver({
        ...shadcnSchemas,
        [documentUrl]: fetched,
        [documentUri]: fetched,
      });
      const next = selectSchema(
        fetched,
        documentUrl,
        documentUri,
        resolver,
        pointer,
      );
      if (ticket === request.current) commit(next);
    } catch (cause) {
      if (ticket === request.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The schema could not be loaded.",
        );
      }
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schema source</CardTitle>
        <CardDescription>
          Load any schema URL or paste and edit JSON locally. References use the
          same Surface resolver as the editor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <form
            noValidate
            aria-busy={loading}
            onSubmit={(event) => {
              event.preventDefault();
              void load(url);
            }}
          >
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="schema-url">Schema URL</FieldLabel>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input
                  id="schema-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error
                      ? "schema-url-help schema-load-error"
                      : "schema-url-help"
                  }
                  placeholder="https://example.com/schema.json"
                  className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={loading || !url.trim()}>
                  {loading ? "Loading…" : "Load schema"}
                </Button>
              </div>
              <FieldDescription id="schema-url-help">
                HTTP(S) URLs and JSON Pointer fragments are supported. Remote
                hosts must allow browser access (CORS).
              </FieldDescription>
            </Field>
          </form>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="schema-example">Examples</FieldLabel>
              <Select
                value={
                  selection.isDemo
                    ? "demo"
                    : examples.some(
                          (example) => example.url === selection.documentUrl,
                        )
                      ? selection.documentUrl
                      : null
                }
                onValueChange={(value) => {
                  if (value === "demo") {
                    request.current++;
                    commit(demoSelection);
                  } else if (value) void load(value);
                }}
              >
                <SelectTrigger id="schema-example" className="w-full">
                  <SelectValue placeholder="Choose an example">
                    {selection.isDemo
                      ? "Built-in contact demo"
                      : examples.find(
                          (example) => example.url === selection.documentUrl,
                        )?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="demo">Built-in contact demo</SelectItem>
                    {examples.map((example) => (
                      <SelectItem key={example.url} value={example.url}>
                        {example.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {selection.choices.length > 1 && (
              <Field>
                <FieldLabel htmlFor="schema-definition">Definition</FieldLabel>
                <Select
                  value={String(
                    selection.choices.findIndex(
                      (choice) => choice.pointer === selection.pointer,
                    ),
                  )}
                  disabled={loading}
                  onValueChange={(value) => {
                    if (value === null) return;
                    const choice = selection.choices[Number(value)];
                    if (!choice) return;
                    request.current++;
                    commit(
                      selectSchema(
                        selection.document,
                        selection.documentUrl,
                        selection.documentUri,
                        selection.resolver,
                        choice.pointer,
                      ),
                    );
                  }}
                >
                  <SelectTrigger id="schema-definition" className="w-full">
                    <SelectValue>
                      {
                        selection.choices.find(
                          (choice) => choice.pointer === selection.pointer,
                        )?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {selection.choices.map((choice, index) => (
                        <SelectItem key={choice.pointer} value={String(index)}>
                          {choice.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <details>
            <summary className="cursor-pointer">Edit schema JSON</summary>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                applySchemaJson();
              }}
            >
              <Field data-invalid={Boolean(jsonError)}>
                <FieldLabel htmlFor="schema-json">Schema JSON</FieldLabel>
                <Textarea
                  id="schema-json"
                  value={schemaJson}
                  onChange={(event) => setSchemaJson(event.target.value)}
                  className="max-h-96 min-h-64"
                  spellCheck={false}
                  aria-invalid={Boolean(jsonError)}
                  aria-describedby={jsonError ? "schema-json-error" : undefined}
                />
                {jsonError && (
                  <Alert variant="destructive" id="schema-json-error">
                    <AlertTitle>Could not apply schema</AlertTitle>
                    <AlertDescription>
                      {jsonError} Your current editor has been kept.
                    </AlertDescription>
                  </Alert>
                )}
              </Field>
              <Button type="submit" className="self-start">
                Apply schema
              </Button>
            </form>
          </details>
          {error && (
            <Alert variant="destructive" id="schema-load-error">
              <AlertTitle>Could not load schema</AlertTitle>
              <AlertDescription>
                {error} Your current editor has been kept.
              </AlertDescription>
            </Alert>
          )}
          <FieldDescription aria-live="polite">
            {loading ? (
              "Loading schema…"
            ) : (
              <>
                Rendering {selection.title}
                {selection.isDemo
                  ? " — built-in annotated example"
                  : ` — ${selection.url}`}
              </>
            )}
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
