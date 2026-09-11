import { isRecord } from "./is-record";

export type CodeParseResult =
  | { readonly kind: "empty" }
  | { readonly kind: "value"; readonly data: unknown }
  | { readonly kind: "issue"; readonly message: string };

/** True when the wire value is a JSON object, not a string of source. */
export function isObjectWire(schema: unknown): boolean {
  return isRecord(schema) && schema.type === "object";
}

/**
 * An additionalProperties map with no declared fields — metadata bags, not
 * structured records. These default to a JSON textarea; a `code` widget opts
 * into CodeMirror.
 */
export function isOpenMap(schema: unknown): boolean {
  if (!isObjectWire(schema) || !isRecord(schema)) return false;
  if (schema.additionalProperties === false) return false;
  const properties = schema.properties;
  if (isRecord(properties) && Object.keys(properties).length > 0) return false;
  return true;
}

export function formatCode(data: unknown, objectWire: boolean): string {
  if (!objectWire) return typeof data === "string" ? data : "";
  if (data === undefined || data === null) return "";
  try {
    return JSON.stringify(data, null, 2) ?? "";
  } catch {
    return "";
  }
}

export function parseCode(
  text: string,
  objectWire: boolean,
): CodeParseResult {
  if (!objectWire) return { kind: "value", data: text };
  if (text.trim().length === 0) return { kind: "empty" };
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "issue", message: "JSON object required." };
    }
    return { kind: "value", data: parsed };
  } catch {
    return { kind: "issue", message: "Invalid JSON." };
  }
}
