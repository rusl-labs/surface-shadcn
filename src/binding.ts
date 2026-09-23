import { isRecord } from "./is-record";

/** Read a dotted path on record data. Missing segments are undefined. */
export function valueAtPath(data: unknown, path: string): unknown {
  let value = data;
  for (const segment of path.split(".")) {
    if (!isRecord(value) || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

/**
 * Resolve a binding the way media `src` does: a dotted-path string, a
 * `{{template}}`, a literal string, or `{ path | template | literal }`.
 */
export function resolveBinding(data: unknown, expression: unknown): unknown {
  if (isRecord(expression)) {
    if (typeof expression.literal === "string") return expression.literal;
    if (typeof expression.path === "string")
      return valueAtPath(data, expression.path);
    expression = expression.template;
  }
  if (typeof expression !== "string") return expression;
  if (expression.includes("{{")) {
    return expression.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
      const value = valueAtPath(data, path);
      return value === undefined || value === null ? "" : String(value);
    });
  }
  return /^\w+(?:\.\w+)*$/.test(expression)
    ? valueAtPath(data, expression)
    : expression;
}

/** Image URL media and avatar will render, or undefined when empty or unsafe. */
export function safeImageSrc(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const src = value.trim();
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
  return src;
}
