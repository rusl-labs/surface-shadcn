"use client";

import type { ReactElement } from "react";
import {
  useSurface,
  type AnnotationEntry,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";

/** A `const` value rendered as text for a form control. */
function constToText(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

/**
 * A const the UI keeps out of sight: an annotation `hidden`, or a stealth
 * `$kind` self-id (surfaced only when the annotation gives it a real label,
 * description, or explicit `hidden: false`). The value still reaches the
 * channel through the save preparation path, so nothing renders here.
 */
function isHiddenConst(
  id: string | undefined,
  entry: AnnotationEntry | undefined,
): boolean {
  if (entry?.hidden === true) return true;
  if (id !== "$kind") return false;
  if (entry?.hidden === false) return false;
  if (entry?.description !== undefined) return false;
  if (entry?.label !== undefined && entry.label !== "$kind") return false;
  return true;
}

/** Input: a fixed const shown read-only (its value lives on the data channel). */
export function ConstInput({ id }: SurfaceProps): ReactElement | null {
  const fs = useFieldState();
  const { schema, entry } = useSurface();
  if (isHiddenConst(id, entry)) return null;
  const text = constToText(isRecord(schema) ? schema.const : undefined);

  return (
    <FieldChrome state={fs}>
      <Input
        id={fs.controlId}
        aria-label={fs.showLabels && fs.label ? undefined : fs.label || "Value"}
        aria-invalid={fs.invalid || undefined}
        required={fs.required}
        value={text}
        readOnly
        aria-describedby={fs.describedBy}
      />
    </FieldChrome>
  );
}

export function ConstDisplay({ id }: SurfaceProps): ReactElement | null {
  const fs = useFieldState();
  const { schema, entry } = useSurface();
  if (isHiddenConst(id, entry)) return null;
  const text = constToText(isRecord(schema) ? schema.const : undefined);

  return (
    <FieldChrome state={fs}>
      <span className="text-sm">{text}</span>
    </FieldChrome>
  );
}
