"use client";

import { useRef } from "react";
import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { FieldScope, isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { ItemActionButton } from "./actions";
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Fallback } from "./fallback";

/** Input: each item — scalar or structured — recurses through a child Surface
 * at its original index id; add/remove rewrite the whole list on the channel. */
export function ArrayInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, entry, dataApi, Surface, mode, view } = useSurface();
  const keySeed = useRef(0);
  const keysRef = useRef<number[]>([]);
  if (Surface === undefined || !isRecord(schema) || !isRecord(schema.items)) {
    return <Fallback id="" />;
  }

  const items = schema.items;
  const minItems = typeof schema.minItems === "number" ? schema.minItems : 0;
  const maxItems =
    typeof schema.maxItems === "number" ? schema.maxItems : undefined;
  const raw = dataApi?.data ?? data;
  const list = Array.isArray(raw) ? raw : [];
  const noun =
    entry?.itemLabel !== undefined && entry.itemLabel.length > 0
      ? entry.itemLabel
      : fs.label.length > 0
        ? fs.label
        : "item";
  const addLabel =
    entry?.addLabel !== undefined && entry.addLabel.length > 0
      ? entry.addLabel
      : `Add ${noun}`;
  const atMin = list.length <= minItems;
  const atMax = maxItems !== undefined && list.length >= maxItems;
  // Stable per-row identity: React keeps each row's local editing draft with
  // its own data across add/remove. Index keys would slide a removed row's
  // draft onto the next survivor and drop the survivor's own; an id that
  // travels with the row keeps each draft attached to its data.
  if (keysRef.current.length > list.length) {
    keysRef.current = keysRef.current.slice(0, list.length);
  } else {
    while (keysRef.current.length < list.length) {
      keysRef.current.push(keySeed.current++);
    }
  }
  const keys = keysRef.current;
  const removeAt = (index: number): void => {
    if (dataApi === undefined) return;
    keysRef.current = keysRef.current.filter((_, i) => i !== index);
    dataApi.setData(list.filter((_, i) => i !== index));
  };
  const addItem = (): void => {
    if (dataApi === undefined) return;
    keysRef.current = [...keysRef.current, keySeed.current++];
    dataApi.setData([...list, undefined]);
  };

  return (
    <FieldSet className="min-w-0" data-invalid={fs.invalid ? true : undefined}>
      {fs.showLabels && fs.label.length > 0 ? (
        <FieldLegend variant="label">{fs.label}</FieldLegend>
      ) : null}
      {fs.description.length > 0 ? (
        <FieldDescription id={`${fs.controlId}-description`}>
          {fs.description}
        </FieldDescription>
      ) : null}
      <FieldScope readOnly={fs.readOnly}>
        <FieldGroup>
          {list.map((item, index) => (
            <div key={keys[index]} className="flex items-start gap-2">
              <div className="flex-1">
                <FieldScope omitLabel>
                  <Surface
                    id={String(index)}
                    schema={items}
                    data={item}
                    mode={mode}
                    view={view}
                  />
                </FieldScope>
              </div>
              <ItemActionButton
                action="remove"
                widget={entry?.widget}
                fallbackLabel="Remove"
                accessibleLabel={`Remove ${noun} ${index + 1}`}
                variant="ghost"
                disabled={fs.readOnly || atMin}
                onClick={() => removeAt(index)}
              />
            </div>
          ))}
        </FieldGroup>
      </FieldScope>
      <ItemActionButton
        action="add"
        widget={entry?.widget}
        fallbackLabel={addLabel}
        variant="outline"
        className="self-start"
        disabled={fs.readOnly || atMax}
        onClick={addItem}
      />
      {fs.issues.length > 0 ? (
        <FieldError
          id={`${fs.controlId}-errors`}
          errors={fs.issues.map((issue) => ({ message: issue.message }))}
        />
      ) : null}
    </FieldSet>
  );
}

/** Display: a list where every item, including scalars, renders via a child
 * Surface at its index id (no comma-joined string that would flatten meaning). */
export function ArrayDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { schema, Surface, mode, view } = useSurface();
  if (Surface === undefined || !isRecord(schema) || !isRecord(schema.items)) {
    return <Fallback id="" />;
  }

  const items = schema.items;
  const list = Array.isArray(data) ? data : [];

  return (
    <FieldSet className="min-w-0" data-invalid={fs.invalid ? true : undefined}>
      {fs.showLabels && fs.label.length > 0 ? (
        <FieldLegend variant="label">{fs.label}</FieldLegend>
      ) : null}
      {fs.description.length > 0 ? (
        <FieldDescription id={`${fs.controlId}-description`}>
          {fs.description}
        </FieldDescription>
      ) : null}
      {list.length === 0 ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((item, index) => (
            <li key={index} className="text-sm">
              <FieldScope omitLabel>
                <Surface
                  id={String(index)}
                  schema={items}
                  data={item}
                  mode={mode}
                  view={view}
                />
              </FieldScope>
            </li>
          ))}
        </ul>
      )}
    </FieldSet>
  );
}
