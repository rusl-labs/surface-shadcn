"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";

/**
 * Default-kit `email` widget. Input is an email-typed control; display is a
 * semantic `mailto:` link so the address stays actionable.
 */
export function EmailInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi } = useSurface();
  const value = typeof data === "string" ? data : "";
  const maxLength =
    isRecord(schema) && typeof schema.maxLength === "number"
      ? schema.maxLength
      : undefined;

  return (
    <FieldChrome state={fs}>
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        id={fs.controlId}
        aria-label={fs.showLabels ? undefined : fs.label}
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
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

export function EmailDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const value = typeof data === "string" ? data : "";
  return (
    <FieldChrome state={fs}>
      {value.length > 0 ? (
        <a
          className="text-sm underline underline-offset-4"
          href={`mailto:${value}`}
        >
          {value}
        </a>
      ) : (
        <span className="text-sm" />
      )}
    </FieldChrome>
  );
}
