/**
 * A plain JSON object: not `null`, not an array, not a primitive.
 *
 * Shared by the schema seeders and field-state helpers so `null` (a present
 * value that fails `type: "object"`) is never mistaken for a record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
