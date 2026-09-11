"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
 * JSON Schema `enum` as the host application's shadcn Select.
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
  const value = selectedIndex >= 0 ? String(selectedIndex) : "unset";

  return (
    <FieldChrome state={fs}>
      <Select
        value={value}
        required={fs.required}
        disabled={fs.readOnly}
        onValueChange={(raw) => {
          if (raw === null) return;
          if (raw === "unset") {
            dataApi?.setData(undefined);
            return;
          }
          const index = Number(raw);
          if (Number.isInteger(index) && index >= 0 && index < options.length) {
            dataApi?.setData(options[index]);
          }
        }}
      >
        <SelectTrigger
          id={fs.controlId}
          className="w-full"
          aria-label={
            fs.showLabels && fs.label ? undefined : fs.label || "Value"
          }
          aria-invalid={fs.invalid || undefined}
          aria-describedby={fs.describedBy}
        >
          <SelectValue>
            {selectedIndex >= 0
              ? optionText(options[selectedIndex])
              : "Select…"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="unset">
              {fs.required ? "Select…" : "None"}
            </SelectItem>
            {options.map((option, index) => (
              <SelectItem key={index} value={String(index)}>
                {optionText(option)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
