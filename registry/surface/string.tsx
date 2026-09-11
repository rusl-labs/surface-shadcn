"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";
import { widgetString } from "./widget";

/**
 * HTML input `type` for a string schema. Only formats whose wire value passes
 * through a native control unchanged are mapped; `date-time` stays text so we
 * never round-trip a `Z`-suffixed value through `datetime-local` (that upgrade
 * belongs to a dedicated date/time widget, not the plain string renderer).
 */
function inputType(format: unknown): string {
  if (format === "email" || format === "idn-email") return "email";
  if (
    format === "uri" ||
    format === "uri-reference" ||
    format === "iri" ||
    format === "iri-reference"
  )
    return "url";
  if (format === "date") return "date";
  if (format === "time") return "time";
  return "text";
}

function stringConstraints(schema: unknown): {
  readonly type: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
} {
  if (!isRecord(schema)) return { type: "text" };
  return {
    type: inputType(schema.format),
    ...(typeof schema.minLength === "number"
      ? { minLength: schema.minLength }
      : {}),
    ...(typeof schema.maxLength === "number"
      ? { maxLength: schema.maxLength }
      : {}),
    ...(typeof schema.pattern === "string" ? { pattern: schema.pattern } : {}),
  };
}

const INPUT_TYPES = new Set([
  "text",
  "password",
  "email",
  "search",
  "tel",
  "url",
]);

export function StringInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const constraints = stringConstraints(schema);
  const value = typeof data === "string" ? data : "";
  const placeholder = widgetString(entry?.widget, "placeholder");
  const widgetType = widgetString(entry?.widget, "type");
  const type =
    widgetType !== undefined && INPUT_TYPES.has(widgetType)
      ? widgetType
      : constraints.type;
  const autoComplete = widgetString(entry?.widget, "autocomplete");

  return (
    <FieldChrome state={fs}>
      <Input
        {...constraints}
        type={type}
        id={fs.controlId}
        aria-label={
          fs.showLabels && fs.label.length > 0
            ? undefined
            : fs.label || placeholder || "Value"
        }
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(autoComplete !== undefined ? { autoComplete } : {})}
        onChange={(event) => {
          dataApi?.setData(event.currentTarget.value);
        }}
      />
    </FieldChrome>
  );
}

export function StringDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const value = typeof data === "string" ? data : "";
  return (
    <FieldChrome state={fs}>
      <span>{value}</span>
    </FieldChrome>
  );
}
