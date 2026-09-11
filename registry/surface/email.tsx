"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Input } from "@/components/ui/input";
import { FieldChrome } from "./chrome";
import { widgetString } from "./widget";

/**
 * `email` widget (`surface.shadcn#/$defs/email`). Input is an email-typed
 * control; display is a `mailto:` link so the address stays actionable.
 */
export function EmailInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const value = typeof data === "string" ? data : "";
  const placeholder = widgetString(entry?.widget, "placeholder");
  const autoComplete =
    widgetString(entry?.widget, "autocomplete") ?? "email";
  const maxLength =
    isRecord(schema) && typeof schema.maxLength === "number"
      ? schema.maxLength
      : undefined;

  return (
    <FieldChrome state={fs}>
      <Input
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        id={fs.controlId}
        aria-label={
          fs.showLabels && fs.label.length > 0
            ? undefined
            : fs.label || placeholder || "Email"
        }
        value={value}
        required={fs.required}
        readOnly={fs.readOnly}
        {...(maxLength !== undefined ? { maxLength } : {})}
        {...(placeholder !== undefined ? { placeholder } : {})}
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
