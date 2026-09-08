"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { useFieldState } from "@rusl-labs/surface-shadcn";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

/**
 * Boolean widget: a checkbox whose label sits beside the control.
 *
 * No native `required` is set — a required boolean means the property is
 * *present*, and `false` (unchecked) is a valid present value. Presence is
 * enforced by the root/channel validation and by the schema default applied in
 * the save preparation path, never by rejecting `false` here. Missing (never
 * toggled, no default) stays missing on purpose.
 */
export function BooleanInput({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const { dataApi } = useSurface();

  const control = (
    <Checkbox
      id={fs.controlId}
      aria-label={fs.showLabels ? undefined : fs.label}
      checked={data === true}
      disabled={fs.readOnly}
      aria-invalid={fs.invalid || undefined}
      aria-describedby={fs.describedBy}
      onCheckedChange={(checked) => {
        dataApi?.setData(checked === true);
      }}
    />
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
        {control}
        {errors}
      </>
    );
  }

  return (
    <Field
      orientation="horizontal"
      data-invalid={fs.invalid ? true : undefined}
    >
      {control}
      {fs.description.length > 0 ? (
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
      ) : null}
      {errors}
    </Field>
  );
}

export function BooleanDisplay({ data }: SurfaceProps): ReactElement {
  const fs = useFieldState();
  const control = (
    <Checkbox
      checked={data === true}
      disabled
      aria-readonly
      aria-label={fs.label}
    />
  );

  if (!fs.showLabels) return control;

  return (
    <Field orientation="horizontal">
      {control}
      {fs.label.length > 0 ? (
        <FieldLabel className="font-normal">{fs.label}</FieldLabel>
      ) : null}
    </Field>
  );
}
