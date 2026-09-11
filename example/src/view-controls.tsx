import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnnotationDocument } from "@rusl-labs/surface";
import Ajv2020 from "ajv/dist/2020";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import annotationSchema from "../../schemas/rusl/surface.annotation.schema.json";
import type { AnnotationContext } from "./view-annotations";

const viewLabels: Record<string, string> = {
  default: "Default",
  compact: "Compact",
  detail: "Detailed",
  identity: "Identity",
  row: "Row",
  card: "Card",
};

export function ViewControls({
  context,
  mappedViews,
  mode,
  view,
  onChange,
}: {
  context: AnnotationContext | undefined;
  mappedViews: readonly string[];
  mode: "input" | "display";
  view: string;
  onChange: (view: string) => void;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const views = [
    ...new Set([...Object.keys(context?.views ?? {}), ...mappedViews]),
  ];
  const available = views.includes(view);
  const fallback = views.includes("default")
    ? "default"
    : (views[0] ?? "default");
  useEffect(() => {
    if (!available && view !== fallback) onChange(fallback);
  }, [available, view, fallback, onChange]);
  const hasAnnotation = context?.views[view] !== undefined;
  const annotation = useMemo(() => {
    if (!context) return "";
    const selected = { [view]: context.views[view] };
    return JSON.stringify(
      {
        $kind: context.document.$kind,
        subject: context.document.subject,
        targetLibraries: context.document.targetLibraries,
        ...(context.definition
          ? { defs: { [context.definition]: { views: selected } } }
          : { views: selected }),
      },
      null,
      2,
    );
  }, [context?.document, context?.definition, view]);

  return (
    <div className="mb-6 flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {views.length > 1 && (
          <Field className="min-w-40 flex-1">
            <FieldLabel htmlFor={id}>
              {mode === "input" ? "Input view" : "Display view"}
            </FieldLabel>
            <Select
              value={view}
              onValueChange={(value) => {
                if (value) onChange(value);
              }}
            >
              <SelectTrigger id={id} className="w-full">
                <SelectValue>{viewLabels[view] ?? view}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {views.map((name) => (
                    <SelectItem key={name} value={name}>
                      {viewLabels[name] ?? name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasAnnotation}
          aria-label={`${expanded ? "Hide" : "Show"} ${mode} annotation`}
          aria-expanded={expanded}
          aria-controls={`${id}-annotation`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide annotation" : "Show annotation"}
        </Button>
      </div>
      <FieldDescription>
        {hasAnnotation
          ? `Mode: ${mode} · View: ${view}. Presentation changes; the draft stays shared.`
          : mappedViews.includes(view)
            ? `Mode: ${mode} · View: ${view}. Defined by this schema's renderer mapping.`
            : "No named views are defined for this schema or renderer. Surface uses its default view."}
      </FieldDescription>
      {expanded && hasAnnotation && (
        <pre
          id={`${id}-annotation`}
          aria-label={`${mode === "input" ? "Input" : "Display"} view annotation`}
          className="max-h-80 overflow-auto"
        >
          <code>{annotation}</code>
        </pre>
      )}
    </div>
  );
}

const validateAnnotation = new Ajv2020({
  strict: false,
}).compile<AnnotationDocument>(annotationSchema);

export function AnnotationEditor({
  annotation,
  onApply,
}: {
  annotation: AnnotationDocument;
  onApply: (annotation: AnnotationDocument) => void;
}) {
  const [text, setText] = useState(() =>
    JSON.stringify(
      annotation.views || annotation.defs
        ? annotation
        : {
            ...annotation,
            views: { default: { fields: [{ rest: true }] } },
          },
      null,
      2,
    ),
  );
  const [error, setError] = useState("");
  return (
    <Card>
      <CardContent>
        <details>
          <summary className="cursor-pointer">Edit annotations</summary>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const next: unknown = JSON.parse(text);
                if (!validateAnnotation(next)) {
                  throw new Error(
                    validateAnnotation.errors
                      ?.map(
                        (issue) =>
                          `${issue.instancePath || "/"} ${issue.message}`,
                      )
                      .join("; "),
                  );
                }
                if (next.subject !== annotation.subject) {
                  throw new Error(
                    `The annotation subject must be ${annotation.subject}.`,
                  );
                }
                onApply(next);
                setError("");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Invalid annotation JSON.",
                );
              }
            }}
          >
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="annotation-json">Annotation JSON</FieldLabel>
              <FieldDescription id="annotation-help">
                Edit the document's named views and per-definition annotations.
                Apply updates both surfaces and their view choices, keeping the
                current data. Views are mode-independent names; field-level
                input/display overrides apply in each panel.
              </FieldDescription>
              <Textarea
                id="annotation-json"
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="max-h-96 min-h-64"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={`annotation-help${error ? " annotation-error" : ""}`}
              />
              {error && <FieldError id="annotation-error">{error}</FieldError>}
            </Field>
            <Button type="submit" className="self-start">
              Apply annotations
            </Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
