import type { AnnotationWidget } from "@rusl-labs/surface";
import { resolveBinding, safeImageSrc, valueAtPath } from "./binding";
import { isRecord } from "./is-record";

/** Resolved presentation for one image; the underlying value is never rewritten. */
export interface ResolvedMediaImage {
  readonly src: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly fit?: "cover" | "contain";
  readonly maxHeight?: number;
}

function dimension(value: unknown): number | undefined {
  const number =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof number === "number" &&
    Number.isSafeInteger(number) &&
    number > 0
    ? number
    : undefined;
}

export function resolveMediaImage(
  data: unknown,
  widget: AnnotationWidget | undefined,
): ResolvedMediaImage | undefined {
  const nested = isRecord(widget?.options) ? widget.options : undefined;
  const option = (key: string) =>
    widget?.[key] !== undefined ? widget[key] : nested?.[key];
  const srcOption = option("src");
  const rawSrc =
    srcOption === undefined
      ? typeof data === "string"
        ? data
        : valueAtPath(data, "url")
      : resolveBinding(data, srcOption);
  const src = safeImageSrc(rawSrc);
  if (src === undefined) return undefined;
  const altOption = option("alt");
  const alt =
    altOption === undefined
      ? valueAtPath(data, "alt")
      : resolveBinding(data, altOption);
  const width = dimension(
    resolveBinding(data, option("width") ?? { path: "width" }),
  );
  const height = dimension(
    resolveBinding(data, option("height") ?? { path: "height" }),
  );
  const fit = option("fit");
  return {
    src,
    alt: typeof alt === "string" ? alt : "",
    width,
    height,
    fit: fit === "cover" || fit === "contain" ? fit : undefined,
    maxHeight: dimension(option("maxHeight")),
  };
}
