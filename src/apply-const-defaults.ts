/**
 * Apply schema `const` / `default` deep into instance data **before** validate.
 *
 * Save must not depend on mount-time seeding, so `const` is forced and
 * `default` fills every genuinely absent (`undefined`) slot before the
 * validator runs. Design constraints (from review of the baseline defects):
 *
 * - **Branch-local cycle safety.** The visited-ref chain is copied down each
 *   descent, never shared globally, so sibling array items / object properties
 *   resolve the same `$ref` independently (the baseline's shared visited set
 *   dropped every repeat).
 * - **Real ref resolution.** `$ref` is resolved through Surface's public
 *   {@link resolveSchemaRef} — local `#/…` against the document in scope,
 *   absolute refs through the resolver — carrying the resolved document down so
 *   nested relative refs keep resolving. Keywords declared beside a `$ref`
 *   (e.g. a sibling `default`) are preserved.
 * - **No union guessing.** Mounted branch Surfaces initialize their own
 *   defaults; save preparation does not choose or inspect alternative branches.
 * - **Faithful values.** Explicit `null` and wrong-type values pass through
 *   unchanged so the validator reports them, rather than being coerced to `{}`.
 */
import {
  resolveSchemaRef,
  type Schema,
  type SchemaResolver,
} from "@rusl-labs/surface";
import { isRecord } from "./is-record";

/** Document scope for resolving relative (`#/…`) refs. */
export interface ApplyConstDefaultsOptions {
  readonly document?: Schema;
  readonly documentUri?: string;
}

interface RefScope {
  readonly resolver: SchemaResolver;
  readonly document: Schema | undefined;
  readonly documentUri: string | undefined;
  /** Absolute-ish ref keys crossed on the current descent (branch-local). */
  readonly ancestry: readonly string[];
}

export async function applyConstAndDefaults(
  schema: Schema,
  data: unknown,
  resolver: SchemaResolver,
  options: ApplyConstDefaultsOptions = {},
): Promise<unknown> {
  return applyAt(schema, data, {
    resolver,
    document: options.document,
    documentUri: options.documentUri,
    ancestry: [],
  });
}

async function applyAt(
  schema: Schema,
  data: unknown,
  scope: RefScope,
): Promise<unknown> {
  const node = schema;
  const nodeScope = scope;

  const ref = typeof schema.$ref === "string" ? schema.$ref : undefined;
  if (ref !== undefined) {
    const refKey = ref.startsWith("#")
      ? `${scope.documentUri ?? ""}${ref}`
      : ref;
    // Skip resolution on a cycle; the unresolved node's siblings still apply.
    if (!scope.ancestry.includes(refKey)) {
      const resolved = await resolveSchemaRef(ref, {
        resolver: scope.resolver,
        document: scope.document,
        documentUri: scope.documentUri,
      });
      if (resolved !== undefined) {
        const siblings = { ...schema };
        delete siblings.$ref;
        const ancestry = [...scope.ancestry, refKey];
        const prepared = await applyAt(
          resolved.schema,
          data === undefined && "default" in siblings ? siblings.default : data,
          {
            resolver: scope.resolver,
            document: resolved.document,
            documentUri: resolved.documentUri,
            ancestry,
          },
        );
        // Sibling schemas apply conjunctively, in their original document.
        // Merging property maps would discard one side's defaults.
        return applyAt(siblings, prepared, { ...scope, ancestry });
      }
    }
  }

  // Whole-node const always wins.
  if ("const" in node && node.const !== undefined) return node.const;

  // Default fills a genuinely absent slot only; explicit null is a value.
  let value = data;
  if (value === undefined && "default" in node && node.default !== undefined) {
    value = node.default;
  }

  // allOf: layer each object arm onto the accumulator.
  if (Array.isArray(node.allOf)) {
    for (const arm of node.allOf) {
      if (isRecord(arm)) value = await applyAt(arm, value, nodeScope);
    }
  }

  // Branch selection belongs to the mounted Surface; do not guess it here.
  if (Array.isArray(node.oneOf) || Array.isArray(node.anyOf)) return value;

  // Descending into a property or item consumes a data level, so cycle
  // ancestry resets: finite data guarantees termination, and the same $ref may
  // legitimately recur deeper. allOf/ref stay on nodeScope (same data node).
  const descent: RefScope = { ...nodeScope, ancestry: [] };

  const propMap = isRecord(node.properties) ? node.properties : undefined;
  if (propMap !== undefined && isRecord(value)) {
    const out: Record<string, unknown> = { ...value };
    const required = Array.isArray(node.required)
      ? node.required.filter((name): name is string => typeof name === "string")
      : [];
    for (const [name, propSchema] of Object.entries(propMap)) {
      if (!isRecord(propSchema)) continue;
      const current = out[name];
      const absent = current === undefined;
      if (absent && !required.includes(name) && !("default" in propSchema)) {
        continue;
      }
      const next = await applyAt(propSchema, current, descent);
      if (next === undefined) delete out[name];
      else out[name] = next;
    }
    return out;
  }

  if (Array.isArray(value) && isRecord(node.items)) {
    const items = node.items;
    return Promise.all(value.map((item) => applyAt(items, item, descent)));
  }

  // Missing / null / wrong-type / scalar: unchanged for the validator.
  return value;
}
