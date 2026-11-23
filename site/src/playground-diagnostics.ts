import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { listFields, resolveAnnotationEntry, type AnnotationDocument, type Schema, type SchemaResolver } from "@rusl-labs/surface";
import annotationSchema from "../../schemas/rusl/surface.annotation.schema.json";
import widgetSchema from "../../schemas/rusl/surface.shadcn.schema.json";
import type { Documents, PreviewMode } from "./playground-state";

export type Category = "schema" | "annotation" | "reference" | "data" | "render";
export interface Diagnostic {
  category: Category;
  source: "definition" | "validation" | "render";
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  /** JSON Pointer within document, or a schema URI for resolver observations. */
  path: string;
  document?: "schema" | "annotation" | "data";
}
export interface Check {
  status: "valid" | "invalid" | "incomplete" | "not-run";
  issues: Diagnostic[];
}
export interface Checks { schema: Check; annotation: Check; reference: Check; data: Check }
export interface ParsedDocuments { schema: Schema; annotation: AnnotationDocument; data: unknown }
export const record = (value: unknown): value is Record<string, any> => value !== null && typeof value === "object" && !Array.isArray(value);
const escape = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validateAnnotation = ajv.compile(annotationSchema);
ajv.addSchema(widgetSchema);
const check = (): Check => ({ status: "not-run", issues: [] });

function errors(category: "schema" | "annotation" | "data", list: ErrorObject[] | null | undefined, source: Diagnostic["source"] = "definition"): Diagnostic[] {
  return (list ?? []).map(error => {
    const property = error.params.additionalProperty ?? error.params.missingProperty;
    return {
      category, document: category, source, severity: "error", code: error.keyword,
      path: error.instancePath + (property ? `/${escape(property)}` : ""),
      message: error.params.additionalProperty === "labelDisplay"
        ? "labelDisplay is still a proposal: the local Surface runtime and installed annotation schema do not support it. Use label text and explicit widget placeholders for now."
        : error.message ?? "Invalid value",
    };
  });
}

/** Definition validity is independent of data validity and of rendering. */
export function inspectDefinitions(documents: Documents): { checks: Checks; documents?: ParsedDocuments } {
  const checks: Checks = { schema: check(), annotation: check(), reference: check(), data: check() };
  const parsed: Record<string, unknown> = {};
  const fail = (category: "schema" | "annotation" | "data", code: string, message: string, path = "") => {
    checks[category] = { status: "invalid", issues: [{ category, document: category, source: "definition", severity: "error", code, message, path }] };
  };
  for (const name of ["schema", "annotation", "data"] as const) {
    if (documents[name].length > 500_000) { fail(name, "size", "Maximum document size is 500,000 characters."); continue; }
    try { parsed[name] = JSON.parse(documents[name]); }
    catch (cause) { fail(name, "json", String(cause)); }
  }
  if (checks.schema.status !== "invalid") {
    if (!record(parsed.schema) || typeof parsed.schema.$id !== "string" || !parsed.schema.$id.trim()) {
      fail("schema", "identity", "schema.$id must be a non-empty absolute URI", "/$id");
    } else {
      try {
        new URL(parsed.schema.$id);
        const valid = ajv.validateSchema(parsed.schema);
        checks.schema = { status: valid ? "valid" : "invalid", issues: errors("schema", ajv.errors) };
      } catch (cause) { fail("schema", "definition", String(cause)); }
    }
  }
  if (checks.annotation.status !== "invalid") {
    const valid = validateAnnotation(parsed.annotation);
    checks.annotation = { status: valid ? "valid" : "invalid", issues: errors("annotation", validateAnnotation.errors) };
    if (valid && record(parsed.schema) && (parsed.annotation as AnnotationDocument).subject !== parsed.schema.$id) {
      fail("annotation", "subject", "annotation.subject must match schema.$id", "/subject");
    }
  }
  if (checks.schema.status !== "valid" || checks.annotation.status !== "valid" || checks.data.status === "invalid") return { checks };
  return { checks, documents: parsed as unknown as ParsedDocuments };
}

/** Compile reachable refs separately from validating user input. No error-message guessing. */
export async function validateDocuments(documents: Documents, resolver: SchemaResolver): Promise<Checks> {
  const definitions = inspectDefinitions(documents);
  const { checks } = definitions;
  if (!definitions.documents) return checks;
  const { schema, data } = definitions.documents;
  const referenceIssues: Diagnostic[] = [];
  const load = async (uri: string) => {
    try {
      const found = resolver.resolveDocument ? await resolver.resolveDocument(uri) : await resolver.resolveSchema(uri);
      if (!found) throw new Error("Resolver returned no schema");
      return found;
    } catch (cause) {
      referenceIssues.push({ category: "reference", document: "schema", source: "validation", severity: "error", code: "unresolved_reference", path: uri, message: String(cause) });
      throw cause;
    }
  };
  const validator = new Ajv2020({ strict: false, allErrors: true });
  addFormats(validator);
  const loaded = new Set([schema.$id as string]);
  try {
    // Unlike compileAsync, retain MissingRefError's structured URI when a loaded
    // document lacks a fragment. Do not classify failures by message text.
    let validate: ValidateFunction;
    while (true) {
      try { validate = validator.compile(schema); break; }
      catch (cause) {
        if (!record(cause) || typeof cause.missingSchema !== "string" || loaded.has(cause.missingSchema)) throw cause;
        if (loaded.size >= 64) {
          referenceIssues.push({ category: "reference", document: "schema", source: "validation", severity: "error", code: "reference_limit", path: cause.missingSchema, message: "Reference validation stopped at 64 documents. Narrow the schema graph." });
          throw cause;
        }
        const document = await load(cause.missingSchema);
        validator.addSchema(document, cause.missingSchema);
        loaded.add(cause.missingSchema);
      }
    }
    checks.reference = { status: "valid", issues: [] };
    const valid = validate(data);
    const issues = errors("data", validate.errors, "validation");
    const missing = (error: ErrorObject) => error.keyword === "required" ||
      (error.keyword === "minLength" && valueAt(data, error.instancePath) === "") ||
      (error.keyword === "minItems" && Array.isArray(valueAt(data, error.instancePath)) && (valueAt(data, error.instancePath) as unknown[]).length === 0);
    checks.data = {
      status: valid ? "valid" : (validate.errors ?? []).every(missing) ? "incomplete" : "invalid",
      issues: issues.map((issue, index) => ({ ...issue, code: missing(validate.errors![index]!) ? "missing_input" : issue.code })),
    };
  } catch (cause) {
    const missingRef = record(cause) && typeof cause.missingRef === "string" ? cause.missingRef : undefined;
    if (missingRef) referenceIssues.push({ category: "reference", document: "schema", source: "validation", severity: "error", code: "unresolved_reference", path: missingRef, message: String(cause) });
    if (referenceIssues.length) checks.reference = { status: "invalid", issues: referenceIssues };
    else checks.schema = { status: "invalid", issues: [{ category: "schema", document: "schema", source: "validation", severity: "error", code: "compile", message: String(cause), path: "" }] };
  }
  return checks;
}

function valueAt(data: unknown, pointer: string): unknown {
  return pointer === "" ? data : pointer.slice(1).split("/").reduce<unknown>((value, key) =>
    value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined, data);
}

const widgetNames = new Set(Object.values(widgetSchema.$defs).flatMap(def =>
  "properties" in def && "name" in def.properties && "const" in def.properties.name ? [def.properties.name.const] : []));
function hasRest(fields: unknown): boolean {
  return Array.isArray(fields) && fields.some(field => record(field) && (field.rest === true || hasRest(field.fields)));
}
const widgetAliases = new Set(["string", "text", "number", "integer", "boolean", "object", "array", "enum", "phone", "date-time", "textarea", "checkbox"]);

/** Located definition advice; not evidence that a node mounted. Uses core for effective field decoration/pruning. */
export function inspectPresentation({ schema, annotation }: ParsedDocuments, mode: PreviewMode, view: string): Diagnostic[] {
  const issues: Diagnostic[] = [];
  const add = (path: string, code: string, message: string, severity: Diagnostic["severity"] = "warning") =>
    issues.push({ category: "annotation", document: "annotation", source: "definition", severity, path, code, message });
  function walk(fields: unknown, pointer: string, path: string[], currentSchema: Schema, subject: string) {
    if (!Array.isArray(fields)) return;
    fields.forEach((raw, index) => {
      if (!record(raw)) return;
      const location = `${pointer}/${index}`;
      const bound = typeof raw.name === "string";
      const childPath = bound ? [...path, raw.name] : path;
      const effective = bound ? resolveAnnotationEntry({ annotation, coordinate: { subject, path: childPath }, view, mode }) ?? {} : { ...raw, ...(record(raw[mode]) ? raw[mode] : {}) };
      if (effective.omit || effective.hidden) add(location, effective.omit ? "omitted" : "hidden", `${effective.omit ? "Omitted" : "Hidden but still participates in data"} by annotation in ${mode} mode.`, "info");
      const widget = effective.widget;
      if (record(widget) && typeof widget.name === "string") {
        const sameWidget = (candidate: unknown) => record(candidate) && JSON.stringify(widget) === JSON.stringify(candidate);
        const widgetLocation = sameWidget(raw[mode]?.widget) ? `${location}/${mode}/widget` : sameWidget(raw.widget) ? `${location}/widget` : location;
        // Core returns effective decoration without source provenance. For inherited
        // widgets locate the affected field, rather than invent a /widget property.
        const localWidget = widgetLocation !== location;
        const supported = bound ? widgetNames.has(widget.name) || widgetAliases.has(widget.name) : widget.name === "separator" || (Array.isArray(raw.fields) && widget.name === "collapsible");
        if (!supported) add(widgetLocation, "unsupported_widget", `No ${bound ? "registered" : "structural"} treatment for '${widget.name}'. The kit may fall back to schema/type rendering or ordinary heading text.`);
        if (widgetNames.has(widget.name)) {
          const validateWidget = ajv.getSchema(`${widgetSchema.$id}#/$defs/${widget.name}`);
          if (validateWidget && !validateWidget(widget)) {
            for (const issue of validateWidget.errors ?? []) {
              const property = issue.params.additionalProperty;
              add(localWidget ? `${widgetLocation}${issue.instancePath}${property ? `/${escape(property)}` : ""}` : location, "widget_options", `Widget '${widget.name}': ${issue.message}. Request get_guidance with topic 'widgets' and this widget's name for its supported options.${["list", "table"].includes(widget.name) ? " Arrays/lists have no built-in between-item divider option." : ""}`);
            }
          }
        }
        if (bound && widget.name === "separator") add(widgetLocation, "separator_on_field", "Separator is structural chrome, not a bound-field renderer. Use {label: '', widget: {name: 'separator'}} in fields. It is not an inter-item divider.");
      }
      const properties = record(currentSchema.properties) ? currentSchema.properties : {};
      const childSchema = bound && record(properties[raw.name]) ? properties[raw.name] as Schema : currentSchema;
      if (Array.isArray(raw.fields)) {
        // Probe this structural entry with core, preserving the current view's default decoration.
        // Restrict to root scopes without rest slots: extracting a rest slot would change its meaning.
        if (!bound && path.length === 0 && subject === annotation.subject && !hasRest(raw.fields)) {
          const scope = annotation;
          const probe: AnnotationDocument = { subject, views: { default: { ...(scope?.views?.default ?? {}), rest: "omit" }, [view === "default" ? "probe" : view]: { fields: [raw], rest: "omit" } } };
          if (listFields({ schema: currentSchema, annotation: probe, coordinate: { subject, path: [] }, mode, view: view === "default" ? "probe" : view }).length === 0) add(location, "pruned_section", "Core yields no children for this section, so it is pruned. Use a heading without fields for standalone presentation.", "info");
        }
        walk(raw.fields, `${location}/fields`, childPath, childSchema, subject);
      }
      if (record(raw.items) && record(childSchema.items)) {
        if (childSchema.items.$ref && Array.isArray(raw.items.fields)) add(`${location}/items`, "referenced_item_layout", "Referenced items use the target annotation (defs for local $defs), not inline items.fields.");
        else walk(raw.items.fields, `${location}/items/fields`, [...childPath, "items"], childSchema.items, subject);
      }
    });
  }
  const scopes: [string, any, Schema, string][] = [["", annotation, schema, annotation.subject]];
  const definitions = record(schema.$defs) ? schema.$defs : {};
  for (const [name, scope] of Object.entries(annotation.defs ?? {})) {
    if (record(definitions[name])) scopes.push([`/defs/${escape(name)}`, scope, definitions[name], `${annotation.subject}#/$defs/${escape(name)}`]);
  }
  for (const [pointer, scope, scopeSchema, subject] of scopes) {
    const name = Array.isArray(scope.views?.[view]?.fields) ? view : "default";
    walk(scope.views?.[name]?.fields, `${pointer}/views/${escape(name)}/fields`, [], scopeSchema, subject);
  }
  return issues;
}
