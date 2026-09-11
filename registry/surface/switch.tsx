"use client";

import type { ReactElement } from "react";
import {
  useSurface,
  type AnnotationWidget,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { widgetOption } from "./widget";

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

function optionText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";
  return JSON.stringify(value);
}

function isEnumSwitch(schema: unknown): boolean {
  return isRecord(schema) && Array.isArray(schema.enum) && schema.enum.length > 0;
}

/**
 * On/off wire values for a switch. Annotation `on` / `off` win. Else a
 * two-member enum uses the second member as on and the first as off. Else
 * boolean true/false.
 */
export function switchEnds(
  schema: unknown,
  widget: AnnotationWidget | undefined,
): { readonly on: unknown; readonly off: unknown } {
  const on = widgetOption(widget, "on");
  const off = widgetOption(widget, "off");
  if (on !== undefined && off !== undefined) return { on, off };
  const options =
    isRecord(schema) && Array.isArray(schema.enum) ? schema.enum : [];
  if (options.length === 2) {
    return { on: on ?? options[1], off: off ?? options[0] };
  }
  return { on: on ?? true, off: off ?? false };
}

function SwitchField({
  data,
  disabled,
}: {
  readonly data: unknown;
  readonly disabled: boolean;
}): ReactElement {
  const fs = useFieldState();
  const { schema, dataApi, entry } = useSurface();
  const { on, off } = switchEnds(schema, entry?.widget);
  const checked = valuesEqual(data, on);
  const named = isEnumSwitch(schema);
  const offLabel = optionText(off);
  const onLabel = optionText(on);
  const switchName = named
    ? fs.label.length > 0
      ? `${fs.label}: ${offLabel} or ${onLabel}`
      : `${offLabel} or ${onLabel}`
    : fs.label || "Value";
  const control = (
    <Switch
      id={fs.controlId}
      nativeButton
      render={<button type="button" />}
      checked={checked}
      disabled={disabled}
      aria-label={
        named || !(fs.showLabels && fs.label.length > 0)
          ? switchName
          : undefined
      }
      aria-invalid={fs.invalid || undefined}
      aria-describedby={fs.describedBy}
      onCheckedChange={(next) => {
        dataApi?.setData(next === true ? on : off);
      }}
    />
  );
  const switchRow = named ? (
    <div className="flex min-w-0 items-center gap-2">
      <span className={checked ? "text-muted-foreground" : undefined}>
        {offLabel}
      </span>
      {control}
      <span className={checked ? undefined : "text-muted-foreground"}>
        {onLabel}
      </span>
    </div>
  ) : (
    control
  );
  const errors =
    fs.issues.length > 0 ? (
      <FieldError
        id={`${fs.controlId}-errors`}
        errors={fs.issues.map((issue) => ({ message: issue.message }))}
      />
    ) : null;

  if (!fs.showLabels) {
    return (
      <>
        {switchRow}
        {errors}
      </>
    );
  }

  const copy =
    fs.description.length > 0 ? (
      <FieldContent>
        {fs.label.length > 0 ? (
          <FieldLabel htmlFor={fs.controlId} className="font-normal">
            {fs.label}
          </FieldLabel>
        ) : null}
        <FieldDescription id={`${fs.controlId}-description`}>
          {fs.description}
        </FieldDescription>
      </FieldContent>
    ) : fs.label.length > 0 ? (
      <FieldLabel htmlFor={fs.controlId} className="font-normal">
        {fs.label}
      </FieldLabel>
    ) : null;

  return (
    <Field
      orientation="horizontal"
      data-invalid={fs.invalid ? true : undefined}
    >
      {named ? (
        <>
          {copy}
          {switchRow}
        </>
      ) : (
        <>
          {control}
          {copy}
        </>
      )}
      {errors}
    </Field>
  );
}

/** Binary switch: boolean, or an enum with two values (optional `on` / `off`). */
export function SwitchInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  return <SwitchField data={data} disabled={fs.readOnly} />;
}

export function SwitchDisplay({ data }: SurfaceProps): ReactElement {
  return <SwitchField data={data} disabled />;
}
