import type { AnnotationWidget } from "@rusl-labs/surface";
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

function atPath(data: unknown, path: string): unknown {
  let value = data;
  for (const segment of path.split(".")) {
    if (!isRecord(value) || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

/** Path, {{template}}, or literal binding used by the media widget. */
function binding(data: unknown, expression: unknown): unknown {
  if (isRecord(expression)) {
    if (typeof expression.literal === "string") return expression.literal;
    if (typeof expression.path === "string")
      return atPath(data, expression.path);
    expression = expression.template;
  }
  if (typeof expression !== "string") return expression;
  if (expression.includes("{{")) {
    return expression.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
      const value = atPath(data, path);
      return value === undefined || value === null ? "" : String(value);
    });
  }
  return /^\w+(?:\.\w+)*$/.test(expression)
    ? atPath(data, expression)
    : expression;
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
        : atPath(data, "url")
      : binding(data, srcOption);
  if (typeof rawSrc !== "string" || rawSrc.trim() === "") return undefined;
  const src = rawSrc.trim();
  try {
    const protocol = new URL(src, "https://surface.invalid/").protocol;
    if (
      !["http:", "https:", "blob:"].includes(protocol) &&
      !/^data:image\//i.test(src)
    )
      return undefined;
  } catch {
    return undefined;
  }
  const altOption = option("alt");
  const alt =
    altOption === undefined ? atPath(data, "alt") : binding(data, altOption);
  const width = dimension(binding(data, option("width") ?? { path: "width" }));
  const height = dimension(
    binding(data, option("height") ?? { path: "height" }),
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
