"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";

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

export function StringInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi } = useSurface();
  const constraints = stringConstraints(schema);
  const value = typeof data === "string" ? data : "";

  return (
    <FieldChrome state={fs}>
      <Input
        {...constraints}
        id={fs.controlId}
        aria-label={fs.showLabels ? undefined : fs.label}
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
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
      <span className="text-sm">{value}</span>
    </FieldChrome>
  );
}
