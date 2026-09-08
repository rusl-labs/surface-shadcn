"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";

/**
 * `number` / `integer` widget. An empty control clears the value to
 * `undefined` (never `0`) so empty drafts are not silently coerced; text that
 * is not a finite number is kept verbatim so validation can flag it.
 */
export function NumberInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi } = useSurface();
  const s = isRecord(schema) ? schema : {};
  const min = typeof s.minimum === "number" ? s.minimum : undefined;
  const max = typeof s.maximum === "number" ? s.maximum : undefined;
  const step =
    typeof s.multipleOf === "number"
      ? s.multipleOf
      : s.type === "integer"
        ? 1
        : "any";
  const value =
    typeof data === "number" && Number.isFinite(data) ? String(data) : "";

  return (
    <FieldChrome state={fs}>
      <Input
        type="number"
        id={fs.controlId}
        aria-label={fs.showLabels ? undefined : fs.label}
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
        step={step}
        {...(min !== undefined ? { min } : {})}
        {...(max !== undefined ? { max } : {})}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          if (raw.length === 0) {
            dataApi?.setData(undefined);
            return;
          }
          const parsed = Number(raw);
          dataApi?.setData(Number.isFinite(parsed) ? parsed : raw);
        }}
      />
    </FieldChrome>
  );
}

export function NumberDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const value =
    typeof data === "number" ? new Intl.NumberFormat().format(data) : "";
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">{value}</span>
    </FieldChrome>
  );
}
