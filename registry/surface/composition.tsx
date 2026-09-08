"use client";

import { useEffect, useState } from "react";
import {
  resolveSchemaRef,
  useSurface,
  type SurfaceProps,
} from "@rusl-labs/surface";
import { FieldScope, isRecord, useFieldState } from "@rusl-labs/surface-shadcn";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Fallback } from "./fallback";

function variantLabel(option: unknown, index: number): string {
  if (!isRecord(option)) return `Option ${index + 1}`;
  if (typeof option.title === "string") return option.title;
  if (typeof option.$ref === "string")
    return option.$ref.split("/").at(-1) || `Option ${index + 1}`;
  if ("const" in option) return String(option.const);
  return `Option ${index + 1}`;
}

/** Each allOf branch is another Surface on the same data, not another tree walk. */
export function AllOf({ data }: SurfaceProps) {
  const { schema, Surface, mode, view, dataApi } = useSurface();
  if (!Surface || !Array.isArray(schema?.allOf)) return <Fallback id="" />;
  return (
    <FieldGroup>
      {schema.allOf.map((branch, index) =>
        isRecord(branch) ? (
          <FieldScope key={index} omitLabel>
            <Surface
              id={`allOf:${index}`}
              schema={branch}
              data={dataApi?.data ?? data}
              mode={mode}
              view={view}
            />
          </FieldScope>
        ) : (
          <Fallback key={index} id="" />
        ),
      )}
    </FieldGroup>
  );
}

/** The current union owns a choice; the chosen Surface owns its schema/ref/view. */
export function Union({ data }: SurfaceProps) {
  const {
    schema,
    Surface,
    mode,
    view,
    dataApi,
    document,
    documentUri,
    options: uiOptions,
  } = useSurface();
  const field = useFieldState();
  const [choice, setChoice] = useState<{ index: number; from: unknown }>();
  const options = schema?.oneOf ?? schema?.anyOf;
  const [titles, setTitles] = useState<{ source: unknown; values: string[] }>();
  const resolver = uiOptions?.schemaResolver;
  useEffect(() => {
    if (mode !== "input" || !Array.isArray(options)) return;
    let cancelled = false;
    void Promise.all(
      options.map(async (option, index) => {
        const fallback = variantLabel(option, index);
        if (!isRecord(option) || typeof option.$ref !== "string")
          return fallback;
        try {
          const resolved = await resolveSchemaRef(option.$ref, {
            resolver,
            document,
            documentUri,
          });
          return typeof resolved?.schema.title === "string"
            ? resolved.schema.title
            : fallback;
        } catch {
          return fallback;
        }
      }),
    ).then((values) => {
      if (!cancelled) setTitles({ source: options, values });
    });
    return () => {
      cancelled = true;
    };
  }, [options, resolver, document, documentUri, mode]);
  if (!Surface || !Array.isArray(options) || options.length === 0)
    return <Fallback id="" />;

  const value = dataApi?.data ?? data;
  const discriminator = isRecord(schema?.discriminator)
    ? schema.discriminator
    : undefined;
  const property =
    typeof discriminator?.propertyName === "string"
      ? discriminator.propertyName
      : "$kind";
  const tag = isRecord(value) ? value[property] : undefined;
  const mapping = isRecord(discriminator?.mapping)
    ? discriminator.mapping
    : undefined;
  const ref =
    typeof tag === "string" && typeof mapping?.[tag] === "string"
      ? mapping[tag]
      : tag;
  const matched = options.findIndex(
    (option) =>
      isRecord(option) &&
      ((typeof option.$ref === "string" && option.$ref === ref) ||
        ("const" in option && Object.is(option.const, value))),
  );
  const marker = tag === undefined ? matched : tag;
  const selected =
    choice && Object.is(choice.from, marker)
      ? choice.index
      : matched >= 0
        ? matched
        : tag !== undefined
          ? undefined
          : 0;
  const branch = selected === undefined ? undefined : options[selected];
  const child = isRecord(branch) ? (
    <FieldScope omitLabel>
      <Surface
        key={selected}
        id={`union:${selected}`}
        schema={branch}
        data={value}
        mode={mode}
        view={view}
      />
    </FieldScope>
  ) : (
    <FieldDescription>No variant selected.</FieldDescription>
  );

  if (mode !== "input") return child;
  return (
    <FieldGroup>
      <Field data-invalid={field.invalid}>
        <FieldLabel htmlFor={field.controlId}>Variant</FieldLabel>
        <NativeSelect
          id={field.controlId}
          value={selected === undefined ? "" : String(selected)}
          disabled={field.readOnly}
          aria-invalid={field.invalid}
          aria-describedby={`${field.controlId}-help${field.invalid ? ` ${field.controlId}-errors` : ""}`}
          onChange={(event) => {
            if (!event.target.value) return;
            // Keep the current value, including data shared by allOf branches.
            // The chosen child owns its constraints, defaults, and fixed values.
            setChoice({ index: Number(event.target.value), from: marker });
          }}
        >
          <NativeSelectOption value="" disabled>
            Choose a variant
          </NativeSelectOption>
          {options.map((option, index) => {
            const label =
              titles?.source === options
                ? titles.values[index]
                : variantLabel(option, index);
            return (
              <NativeSelectOption key={index} value={String(index)}>
                {label}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
        <FieldDescription id={`${field.controlId}-help`}>
          The selected variant validates the current data.
        </FieldDescription>
        {field.invalid && (
          <FieldError
            id={`${field.controlId}-errors`}
            errors={field.issues.map((issue) => ({ message: issue.message }))}
          />
        )}
      </Field>
      {child}
    </FieldGroup>
  );
}
