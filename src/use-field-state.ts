import { useContext, useEffect, useId } from "react";
import {
  issuesAt,
  resolveDescription,
  resolveLabel,
  useSurface,
  type ValidityIssue,
} from "@rusl-labs/surface";
import { FieldScopeContext } from "./field-scope";
import { isRecord } from "./is-record";

/**
 * Everything a leaf field wrapper needs to paint accessible chrome around a
 * control, derived from the mounted Surface node plus the nearest
 * {@link FieldScope}.
 */
export interface FieldState {
  /** Stable id for the control; label/description/errors reference it. */
  readonly controlId: string;
  /** Resolved label text (annotation entry, view, schema title, or name). */
  readonly label: string;
  /** Resolved description text, or `""` when the node has none. */
  readonly description: string;
  /** False when an ancestor suppressed labels (e.g. a table cell). */
  readonly showLabels: boolean;
  /** Required by the parent object. */
  readonly required: boolean;
  /** Read-only: inherited scope, or `schema.readOnly`, or a `const` node. */
  readonly readOnly: boolean;
  /** Channel issues for this node once a Save has been attempted. */
  readonly issues: readonly ValidityIssue[];
  /** True when {@link issues} is non-empty. */
  readonly invalid: boolean;
  /** `aria-describedby` value linking whichever chrome ids are present. */
  readonly describedBy: string | undefined;
}

export function useFieldState(): FieldState {
  const surface = useSurface();
  const { schema, data, dataApi, mode } = surface;
  // Like surface-html: initialize only the node this renderer has mounted.
  // Children initialize themselves; no property/ref/branch traversal here.
  useEffect(() => {
    if (mode !== "input" || !schema || !dataApi) return;
    if ("const" in schema && schema.const !== undefined) {
      if (!Object.is(dataApi.data, schema.const)) dataApi.setData(schema.const);
    } else if (dataApi.data === undefined && schema.default !== undefined) {
      dataApi.setData(schema.default);
    }
  }, [schema, data, dataApi, mode]);
  const scope = useContext(FieldScopeContext);
  const controlId = useId();

  const showLabels = surface.labels !== false && !scope.omitLabel;

  const label =
    surface.helpers?.label() ??
    resolveLabel({
      id: surface.id ?? "",
      schema: surface.schema,
      entry: surface.entry,
      annotation: surface.annotation,
      coordinate: surface.coordinate,
      view: surface.view,
    });

  const description =
    surface.helpers?.description() ??
    resolveDescription({
      entry: surface.entry,
      annotation: surface.annotation,
      coordinate: surface.coordinate,
      view: surface.view,
    });

  const readOnly =
    scope.readOnly ||
    (isRecord(schema) &&
      (schema.readOnly === true ||
        ("const" in schema && schema.const !== undefined)));

  // Local-node issues (path []) surface only after a Save attempt.
  const issues =
    surface.formSubmitted === true
      ? issuesAt(surface.validity?.issues ?? [], [])
      : [];
  const invalid = issues.length > 0;

  const describedParts: string[] = [];
  if (showLabels && description.length > 0) {
    describedParts.push(`${controlId}-description`);
  }
  if (invalid) describedParts.push(`${controlId}-errors`);
  const describedBy =
    describedParts.length > 0 ? describedParts.join(" ") : undefined;

  return {
    controlId,
    label,
    description,
    showLabels,
    required: scope.required,
    readOnly,
    issues,
    invalid,
    describedBy,
  };
}
