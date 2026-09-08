"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { FieldScope, isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
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

  return (
    <FieldSet className="min-w-0" data-invalid={fs.invalid ? true : undefined}>
      {fs.showLabels && fs.label.length > 0 ? (
        <FieldLegend variant="label">{fs.label}</FieldLegend>
      ) : null}
      {fs.showLabels && fs.description.length > 0 ? (
        <FieldDescription id={`${fs.controlId}-description`}>
          {fs.description}
        </FieldDescription>
      ) : null}
      <FieldScope readOnly={fs.readOnly}>
        <FieldGroup>
          {list.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <FieldScope omitLabel>
                  <Surface
                    id={String(index)}
                    schema={items}
                    data={item}
                    mode={mode}
                    view={view}
                    entry={
                      typeof items.$ref === "string"
                        ? undefined
                        : { label: `${noun} ${index + 1}` }
                    }
                  />
                </FieldScope>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fs.readOnly || atMin}
                aria-label={`Remove ${noun} ${index + 1}`}
                onClick={() => {
                  dataApi?.setData(list.filter((_, i) => i !== index));
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </FieldGroup>
      </FieldScope>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fs.readOnly || atMax}
        onClick={() => {
          dataApi?.setData([...list, undefined]);
        }}
      >
        {addLabel}
      </Button>
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
