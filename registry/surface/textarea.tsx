"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Textarea } from "@/components/ui/textarea";
import { FieldChrome } from "./chrome";

/**
 * Multiline string widget (`surface.shadcn#/$defs/textarea`, name `textarea`).
 * Rows come from `widget.options.rows`; the wire value is the raw string, so
 * display simply re-renders it with preserved whitespace.
 */
export function TextareaInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, entry, dataApi } = useSurface();

  const options = entry?.widget?.options;
  const rowsRaw = isRecord(options) ? options.rows : undefined;
  const rows = typeof rowsRaw === "number" && rowsRaw > 0 ? rowsRaw : undefined;
  const maxLength =
    isRecord(schema) && typeof schema.maxLength === "number"
      ? schema.maxLength
      : undefined;
  const value = typeof data === "string" ? data : "";

  return (
    <FieldChrome state={fs}>
      <Textarea
        id={fs.controlId}
        aria-label={fs.showLabels ? undefined : fs.label}
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
        {...(rows !== undefined ? { rows } : {})}
        {...(maxLength !== undefined ? { maxLength } : {})}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        onChange={(event) => {
          dataApi?.setData(event.currentTarget.value);
        }}
      />
    </FieldChrome>
  );
}

export function TextareaDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const value = typeof data === "string" ? data : "";
  return (
    <FieldChrome state={fs}>
      <span className="text-sm whitespace-pre-wrap">{value}</span>
    </FieldChrome>
  );
}
