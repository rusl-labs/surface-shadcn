"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput as ComboboxSearch,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldChrome } from "./chrome";
import { widgetString } from "./widget";

function optionText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

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

function enumOptions(schema: unknown): unknown[] {
  return isRecord(schema) && Array.isArray(schema.enum) ? schema.enum : [];
}

function ChoiceDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  return (
    <FieldChrome state={fs}>
      <span className="text-sm">
        {data === undefined || data === null ? "" : optionText(data)}
      </span>
    </FieldChrome>
  );
}

export function ComboboxInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const options = enumOptions(schema);
  const items = options.map((option, index) => ({
    value: String(index),
    label: optionText(option),
  }));
  const selected = options.findIndex((option) => valuesEqual(option, data));
  const current = selected >= 0 ? items[selected] : null;
  return (
    <FieldChrome state={fs}>
      <Combobox
        items={items}
        value={current}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.value}
        disabled={fs.readOnly}
        onValueChange={(item) => {
          if (!item) {
            dataApi?.setData(undefined);
            return;
          }
          dataApi?.setData(options[Number(item.value)]);
        }}
      >
        <ComboboxTrigger
          id={fs.controlId}
          className="w-full"
          aria-invalid={fs.invalid || undefined}
          aria-describedby={fs.describedBy}
        >
          <ComboboxValue>
            {current?.label ??
              widgetString(entry?.widget, "placeholder") ??
              "Select…"}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxSearch
            showTrigger={false}
            placeholder={
              widgetString(entry?.widget, "searchPlaceholder") ?? "Search…"
            }
          />
          <ComboboxEmpty>
            {widgetString(entry?.widget, "emptyText") ?? "No matches."}
          </ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </FieldChrome>
  );
}

export const ComboboxDisplay = ChoiceDisplay;

export function RadioGroupInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const options = enumOptions(schema);
  const selected = options.findIndex((option) => valuesEqual(option, data));
  const orientation =
    widgetString(entry?.widget, "orientation") === "horizontal"
      ? "horizontal"
      : "vertical";
  return (
    <FieldChrome state={fs}>
      <RadioGroup
        value={selected >= 0 ? String(selected) : ""}
        disabled={fs.readOnly}
        aria-invalid={fs.invalid || undefined}
        aria-describedby={fs.describedBy}
        className={orientation === "horizontal" ? "grid-flow-col" : undefined}
        onValueChange={(raw) => {
          if (raw === null || raw === "") {
            dataApi?.setData(undefined);
            return;
          }
          dataApi?.setData(options[Number(raw)]);
        }}
      >
        {options.map((option, index) => (
          <Field key={index} orientation="horizontal" className="w-auto">
            <RadioGroupItem
              id={`${fs.controlId}-${index}`}
              value={String(index)}
            />
            <FieldLabel htmlFor={`${fs.controlId}-${index}`}>
              {optionText(option)}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldChrome>
  );
}

export const RadioGroupDisplay = ChoiceDisplay;

export function ToggleGroupInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const options = enumOptions(schema);
  const selected = options.findIndex((option) => valuesEqual(option, data));
  const variant =
    widgetString(entry?.widget, "variant") === "outline"
      ? "outline"
      : "default";
  return (
    <FieldChrome state={fs}>
      <ToggleGroup
        value={selected >= 0 ? [String(selected)] : []}
        disabled={fs.readOnly}
        variant={variant}
        className="flex flex-wrap"
        onValueChange={(values) => {
          const raw = Array.isArray(values) ? values[0] : values;
          if (raw === undefined || raw === null) {
            dataApi?.setData(undefined);
            return;
          }
          dataApi?.setData(options[Number(raw)]);
        }}
      >
        {options.map((option, index) => (
          <ToggleGroupItem key={index} value={String(index)}>
            {optionText(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldChrome>
  );
}

export const ToggleGroupDisplay = ChoiceDisplay;
