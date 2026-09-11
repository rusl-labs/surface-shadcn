"use client";

import { useSurface, type SurfaceProps } from "@rusl-labs/surface";
import { resolveMediaImage, useFieldState } from "@rusl-labs/surface-shadcn";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { FieldChrome } from "./chrome";

/** One image per Surface node: array items retain their normal Surface path. */
export function MediaDisplay({ data }: SurfaceProps) {
  const { entry, view } = useSurface();
  const field = useFieldState();
  const image = resolveMediaImage(data, entry?.widget);
  const content = image ? (
    <img
      id={field.controlId}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading="lazy"
      decoding="async"
      aria-describedby={field.describedBy}
      className="block max-w-full"
      style={{
        height: image.width !== undefined ? "auto" : undefined,
        aspectRatio:
          image.width !== undefined && image.height !== undefined
            ? `${image.width} / ${image.height}`
            : undefined,
        objectFit: image.fit,
        maxHeight: image.maxHeight,
      }}
    />
  ) : (
    <FieldDescription>No image source available.</FieldDescription>
  );

  return (
    <FieldChrome state={field}>
      {view === "card" && image ? (
        <Card size="sm" className="overflow-hidden py-0">
          <CardContent className="p-0">{content}</CardContent>
        </Card>
      ) : (
        content
      )}
    </FieldChrome>
  );
}
