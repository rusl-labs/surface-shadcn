"use client";

import type { ReactElement } from "react";
import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Rendered when a node is still resolving, failed to resolve, or has no
 * registered renderer. Always produces visible, meaningful chrome — never a
 * silent `null` — so unsupported shapes and load failures are discoverable in
 * the running UI instead of vanishing.
 */
export function Fallback(_props: SurfaceProps): ReactElement {
  const { loading, error, schema, mode } = useSurface();

  if (loading === true) {
    return (
      <Alert>
        <AlertTitle>Loading…</AlertTitle>
        <AlertDescription>Resolving this field&apos;s schema.</AlertDescription>
      </Alert>
    );
  }

  if (typeof error === "string" && error.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this field</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const shape = isRecord(schema)
    ? typeof schema.type === "string"
      ? `type "${schema.type}"`
      : Array.isArray(schema.oneOf)
        ? "a oneOf union"
        : Array.isArray(schema.anyOf)
          ? "an anyOf union"
          : Array.isArray(schema.allOf)
            ? "an allOf composition"
            : "this schema shape"
    : "this schema shape";

  return (
    <Alert variant="destructive">
      <AlertTitle>Unsupported field</AlertTitle>
      <AlertDescription>
        No {mode ?? "input"} renderer is registered for {shape}.
      </AlertDescription>
    </Alert>
  );
}
