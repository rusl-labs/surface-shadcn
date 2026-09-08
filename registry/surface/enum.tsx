"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FieldChrome } from "./chrome";

/** Human-readable label for an enum value of any JSON type. */
function optionText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

/** Structural equality good enough to match a stored value to an enum member. */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * JSON Schema `enum` as a native select.
 *
 * Option values are the enum *index* encoded as a string, never the value's
 * text. On change we look the index back up and write the exact JSON value —
 * so numbers, booleans, `null`, and objects round-trip without being coerced
 * to their string labels.
 */
export function EnumInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi } = useSurface();
  const options =
    isRecord(schema) && Array.isArray(schema.enum) ? schema.enum : [];
  const selectedIndex = options.findIndex((option) =>
    valuesEqual(option, data),
  );
  const value = selectedIndex >= 0 ? String(selectedIndex) : "";

  return (
    <FieldChrome state={fs}>
      <NativeSelect
        id={fs.controlId}
        aria-label={fs.showLabels ? undefined : fs.label}
        value={value}
        required={fs.required}
        disabled={fs.readOnly}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          if (raw.length === 0) {
            dataApi?.setData(undefined);
            return;
          }
          const index = Number(raw);
          if (Number.isInteger(index) && index >= 0 && index < options.length) {
            dataApi?.setData(options[index]);
          }
        }}
      >
        <NativeSelectOption value="">
          {fs.required ? "Select…" : ""}
        </NativeSelectOption>
        {options.map((option, index) => (
          <NativeSelectOption key={index} value={String(index)}>
            {optionText(option)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FieldChrome>
  );
}

export function EnumDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">
        {data === undefined || data === null ? "" : optionText(data)}
      </span>
    </FieldChrome>
  );
}
