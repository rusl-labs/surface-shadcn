import type { AnnotationWidget } from "@rusl-labs/surface";
import { isRecord } from "@rusl-labs/surface-shadcn";

/** Top-level widget key wins over nested `options.*`. */
export function widgetOption(
  widget: AnnotationWidget | undefined,
  key: string,
): unknown {
  if (!widget) return undefined;
  if (widget[key] !== undefined) return widget[key];
  return isRecord(widget.options) ? widget.options[key] : undefined;
}

export function widgetString(
  widget: AnnotationWidget | undefined,
  key: string,
): string | undefined {
  const value = widgetOption(widget, key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function widgetBoolean(
  widget: AnnotationWidget | undefined,
  key: string,
): boolean | undefined {
  const value = widgetOption(widget, key);
  return typeof value === "boolean" ? value : undefined;
}
