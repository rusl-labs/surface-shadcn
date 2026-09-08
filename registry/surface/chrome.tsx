"use client";

import type { ReactElement, ReactNode } from "react";
import { useSurface, type FieldDirection } from "@rusl-labs/surface";
import type { FieldState } from "@rusl-labs/surface-shadcn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

type Orientation = "vertical" | "horizontal";

/**
 * Leaf chrome for a bound control.
 *
 * Driven entirely by the field `state` the leaf resolves once with
 * {@link useFieldState}. The leaf passes the SAME state here so the label's
 * `htmlFor`, the control `id`, and the `aria-describedby` chrome ids all agree
 * — calling the hook twice would mint two different `controlId`s.
 *
 * When `showLabels` is false (a parent description-list row already owns the
 * label) the control renders bare — no `Field` wrapper, no duplicate label —
 * followed only by its error list when there is one.
 */
export function FieldChrome({
  state: fs,
  children,
  orientation = "vertical",
}: {
  readonly state: FieldState;
  readonly children: ReactNode;
  readonly orientation?: Orientation;
}): ReactElement {
  const { mode } = useSurface();

  const errors =
    fs.issues.length > 0 ? (
      <FieldError
        id={`${fs.controlId}-errors`}
        errors={fs.issues.map((issue) => ({ message: issue.message }))}
      />
    ) : null;

  if (!fs.showLabels) {
    return (
      <>
        {children}
        {errors}
      </>
    );
  }

  return (
    <Field
      orientation={orientation}
      data-invalid={fs.invalid ? true : undefined}
    >
      {fs.label.length > 0 ? (
        <FieldLabel htmlFor={mode === "input" ? fs.controlId : undefined}>
          {fs.label}
        </FieldLabel>
      ) : null}
      {children}
      {fs.description.length > 0 ? (
        <FieldDescription id={`${fs.controlId}-description`}>
          {fs.description}
        </FieldDescription>
      ) : null}
      {errors}
    </Field>
  );
}

/**
 * Grouping chrome for an annotation `section`. The object renderer wraps the
 * section body in the right container (a `dl` for display description lists, a
 * `FieldGroup` for input) and passes it as `children`; this component only adds
 * the semantic `FieldSet` / `FieldLegend` when the section is named. Anonymous
 * sections pass straight through.
 */
export function SectionChrome({
  label,
  description,
  children,
}: {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode;
}): ReactElement {
  const { labels } = useSurface();
  const named =
    labels !== false &&
    (label.length > 0 || (description !== undefined && description.length > 0));
  if (!named) return <>{children}</>;
  return (
    <FieldSet className="min-w-0">
      {label.length > 0 ? (
        <FieldLegend variant="label">{label}</FieldLegend>
      ) : null}
      {description !== undefined && description.length > 0 ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {children}
    </FieldSet>
  );
}

/** Standalone annotation `heading` — a legend with no controls of its own. */
export function HeadingChrome({
  label,
}: {
  readonly label: string;
}): ReactElement {
  return (
    <FieldSet className="min-w-0">
      <FieldLegend variant="label">{label}</FieldLegend>
    </FieldSet>
  );
}

/** Annotation `template` — pre-interpolated prose rendered as helper text. */
export function TemplateChrome({
  text,
}: {
  readonly text: string;
}): ReactElement {
  return <FieldDescription>{text}</FieldDescription>;
}

/** Annotation `block` — a grouped region, optionally titled, around its body. */
export function BlockChrome({
  label,
  description,
  text,
  children,
}: {
  readonly label?: string;
  readonly description?: string;
  readonly text?: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <FieldSet className="min-w-0">
      {label !== undefined && label.length > 0 ? (
        <FieldLegend variant="label">{label}</FieldLegend>
      ) : null}
      {description !== undefined && description.length > 0 ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {text !== undefined && text.length > 0 ? (
        <FieldDescription>{text}</FieldDescription>
      ) : null}
      {children}
    </FieldSet>
  );
}

/** Annotation `banner` — a callout built from the host Alert primitive. */
export function BannerChrome({
  label,
  description,
  text,
  children,
}: {
  readonly label?: string;
  readonly description?: string;
  readonly text?: string;
  readonly children: ReactNode;
}): ReactElement {
  const body = text !== undefined && text.length > 0 ? text : description;
  return (
    <Alert>
      {label !== undefined && label.length > 0 ? (
        <AlertTitle>{label}</AlertTitle>
      ) : null}
      {body !== undefined && body.length > 0 ? (
        <AlertDescription>{body}</AlertDescription>
      ) : null}
      {children}
    </Alert>
  );
}

/** Annotation `span` — a light grouping wrapper, optionally labelled. */
export function SpanChrome({
  label,
  text,
  direction = "vertical",
  children,
}: {
  readonly label?: string;
  readonly text?: string;
  readonly direction?: FieldDirection;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div
      className={
        direction === "horizontal"
          ? "flex flex-row flex-wrap gap-4"
          : "flex flex-col gap-2"
      }
    >
      {label !== undefined && label.length > 0 ? (
        <FieldLabel>{label}</FieldLabel>
      ) : null}
      {text !== undefined && text.length > 0 ? (
        <FieldDescription>{text}</FieldDescription>
      ) : null}
      {children}
    </div>
  );
}
