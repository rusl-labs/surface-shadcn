import type { Schema } from "@rusl-labs/surface";
import { isRecord } from "./is-record";

/**
 * Initial draft value for a schema, used when a wrapper materializes a value
 * with no data yet: a newly-present optional object property or a freshly
 * added array item.
 *
 * - **const** — the fixed value (a const node is not user-editable).
 * - **default** — the declared default.
 * - **enum** (no const/default) — `undefined`: never auto-select a member, so
 *   an optional choice stays empty until the user picks one.
 * - **object** — `{}` carrying only required properties and properties that
 *   declare their own const/default (so `$kind` / `countryCode` consts and
 *   declared defaults land); optional scalars are left absent.
 * - **array** — `[]` (an empty collection to add into).
 * - **boolean** — `false`; **string** — `""`.
 * - **number / integer** — `undefined`: an empty numeric draft is not `0`.
 *
 * Save does not depend on this: it re-applies const/default over the whole
 * subject before validating (see {@link useFormActions}).
 */
export function seedValue(schema: Schema): unknown {
  if (!isRecord(schema)) return undefined;

  if ("const" in schema && schema.const !== undefined) return schema.const;
  if ("default" in schema && schema.default !== undefined) {
    return schema.default;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return undefined;

  const declared = schema.type;
  const types =
    typeof declared === "string"
      ? [declared]
      : Array.isArray(declared)
        ? declared.filter((name): name is string => typeof name === "string")
        : [];

  const properties = isRecord(schema.properties)
    ? schema.properties
    : undefined;
  const looksObject =
    types.includes("object") ||
    (types.length === 0 && properties !== undefined);

  if (looksObject && properties !== undefined) {
    const required = Array.isArray(schema.required)
      ? schema.required.filter(
          (name): name is string => typeof name === "string",
        )
      : [];
    const seeded: Record<string, unknown> = {};
    for (const [name, propSchema] of Object.entries(properties)) {
      if (!isRecord(propSchema)) continue;
      const hasFixed =
        ("const" in propSchema && propSchema.const !== undefined) ||
        ("default" in propSchema && propSchema.default !== undefined);
      if (!required.includes(name) && !hasFixed) continue;
      const value = seedValue(propSchema);
      if (value !== undefined) seeded[name] = value;
    }
    return seeded;
  }

  if (types.includes("array")) return [];
  if (types.includes("boolean")) return false;
  if (types.includes("string")) return "";
  // number / integer / unconstrained: keep the draft empty.
  return undefined;
}
