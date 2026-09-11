"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  useSurface,
  type FieldChild,
  type FieldDirection,
  type FieldLayout,
  type SurfaceComponent,
} from "@rusl-labs/surface";
import {
  FieldScope,
  formatCode,
  isOpenMap,
  isRecord,
  parseCode,
  seedValue,
  useDraftField,
  useFieldState,
} from "@rusl-labs/surface-shadcn";
import { ItemActionButton } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  BannerChrome,
  BlockChrome,
  FieldChrome,
  HeadingChrome,
  SectionChrome,
  SpanChrome,
  TemplateChrome,
} from "./chrome";
import { Fallback } from "./fallback";
import { widgetBoolean, widgetString } from "./widget";

interface RenderCtx {
  readonly required: Readonly<Record<string, true>>;
  readonly readOnly: boolean;
  readonly labels: boolean;
  readonly layout: FieldLayout;
  readonly direction: FieldDirection;
  readonly Surface: SurfaceComponent;
  /** Parent object's data channel — presence toggles write child slots here. */
  readonly setChild:
    ((key: string | number, next: unknown) => void) | undefined;
}

function sectionWidgetName(child: FieldChild): string | undefined {
  return child.kind === "section" ? child.widget?.name : undefined;
}

function SectionCollapsible({
  child,
  children,
}: {
  child: FieldChild & { kind: "section" };
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(
    widgetBoolean(child.widget, "defaultOpen") === true,
  );
  const trigger =
    widgetString(child.widget, "label") ??
    (child.label.length > 0 ? child.label : open ? "Hide" : "Show");
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={<Button variant="outline" size="sm" className="self-start" />}
      >
        {trigger}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 pt-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Whether this object mount paints its own title.
 *
 * Root subjects and named property mounts do; nested absolute-`$id` branches
 * (a union arm already named by its selector) and synthetic ids (array items,
 * `allOf:N`) do not — their parent chrome already situates them.
 */
function showsObjectTitle(
  isRoot: boolean | undefined,
  id: string | undefined,
  title: string,
): boolean {
  if (title.length === 0) return false;
  if (isRoot === true) return true;
  if (id === undefined) return true;
  if (id.includes("://") || id.startsWith("urn:")) return false;
  if (/^\d+$/.test(id) || id.startsWith("allOf:") || id.startsWith("union:"))
    return false;
  return true;
}

/**
 * An optional structured property (object / `$ref` / `allOf` / structured
 * union) needs an explicit Add/Remove presence control; scalars and arrays own
 * their own empty state. Required properties are always present.
 */
function needsPresenceToggle(schema: unknown, required: boolean): boolean {
  if (required || !isRecord(schema)) return false;
  // Open maps edit as JSON text; empty is a valid absent value.
  if (isOpenMap(schema)) return false;
  if (schema.type === "object") return true;
  if (typeof schema.$ref === "string") return true;
  if (Array.isArray(schema.allOf)) return true;
  const union = schema.oneOf ?? schema.anyOf;
  if (Array.isArray(union)) {
    return union.some(
      (branch) =>
        isRecord(branch) &&
        (branch.type === "object" ||
          typeof branch.$ref === "string" ||
          Array.isArray(branch.allOf) ||
          Array.isArray(branch.oneOf) ||
          Array.isArray(branch.anyOf)),
    );
  }
  return false;
}

function requiredNames(schema: unknown): Readonly<Record<string, true>> {
  const names: Record<string, true> = {};
  if (isRecord(schema) && Array.isArray(schema.required)) {
    for (const name of schema.required) {
      if (typeof name === "string") names[name] = true;
    }
  }
  return names;
}

/** One editable property: presence chrome for optional structured slots. */
function InputField({
  child,
  ctx,
}: {
  child: FieldChild & { kind: "field" };
  ctx: RenderCtx;
}): ReactNode {
  const name = child.surface.id;
  const required = ctx.required[name] === true;
  const value = child.surface.data;
  const present = value !== undefined && value !== null;
  const toggle = needsPresenceToggle(child.surface.schema, required);
  const readOnly =
    ctx.readOnly ||
    child.surface.schema?.readOnly === true ||
    child.surface.schema?.const !== undefined;
  const noun = child.label.length > 0 ? child.label : name;
  const addLabel =
    child.entry?.addLabel !== undefined && child.entry.addLabel.length > 0
      ? child.entry.addLabel
      : `Add ${noun}`;

  const mounted = (
    <FieldScope
      required={required}
      omitLabel={toggle && ctx.labels && child.label.length > 0}
    >
      <ctx.Surface {...child.surface} />
    </FieldScope>
  );

  if (toggle && !present) {
    return (
      <div className="flex flex-col gap-2">
        {ctx.labels && child.label.length > 0 ? (
          <FieldLabel>{child.label}</FieldLabel>
        ) : null}
        <ItemActionButton
          action="add"
          widget={child.entry?.widget}
          fallbackLabel={addLabel}
          variant="outline"
          className="self-start"
          disabled={readOnly}
          onClick={() => {
            ctx.setChild?.(name, seedValue(child.surface.schema ?? {}) ?? {});
          }}
        />
      </div>
    );
  }

  if (toggle && present) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {ctx.labels && child.label.length > 0 ? (
            <FieldLabel>{child.label}</FieldLabel>
          ) : null}
          <ItemActionButton
            action="remove"
            widget={child.entry?.widget}
            fallbackLabel="Remove"
            accessibleLabel={`Remove ${noun}`}
            variant="ghost"
            disabled={readOnly}
            onClick={() => {
              ctx.setChild?.(name, undefined);
            }}
          />
        </div>
        {mounted}
      </div>
    );
  }

  return mounted;
}

/** Input body: annotation children in a FieldGroup, sections nested as FieldSets. */
function InputBody({
  nodes,
  ctx,
}: {
  nodes: readonly FieldChild[];
  ctx: RenderCtx;
}): ReactElement {
  return (
    <FieldGroup
      className={
        ctx.direction === "horizontal"
          ? "flex-row flex-wrap *:min-w-48 *:flex-1"
          : undefined
      }
    >
      {nodes.map((child) => {
        switch (child.kind) {
          case "field":
            return child.hidden === true ? null : (
              <InputField key={child.key} child={child} ctx={ctx} />
            );
          case "section": {
            const body = (
              <SectionChrome
                label={child.label}
                {...(child.description !== undefined
                  ? { description: child.description }
                  : {})}
              >
                <InputBody
                  nodes={child.children()}
                  ctx={{
                    ...ctx,
                    direction: child.direction ?? ctx.direction,
                    layout: child.layout ?? ctx.layout,
                  }}
                />
              </SectionChrome>
            );
            return sectionWidgetName(child) === "separator" ? (
              <div key={child.key} className="flex flex-col gap-3">
                <Separator />
                {body}
              </div>
            ) : sectionWidgetName(child) === "collapsible" ? (
              <SectionCollapsible key={child.key} child={child}>
                {body}
              </SectionCollapsible>
            ) : (
              <div key={child.key}>{body}</div>
            );
          }
          case "heading":
            return <HeadingChrome key={child.key} label={child.label} />;
          case "template":
            return <TemplateChrome key={child.key} text={child.text} />;
          case "block":
          case "banner":
          case "span":
            return (
              <StructuredSlot key={child.key} child={child}>
                <InputBody
                  nodes={child.children()}
                  ctx={{
                    ...ctx,
                    direction: child.direction ?? ctx.direction,
                    layout: child.layout ?? ctx.layout,
                  }}
                />
              </StructuredSlot>
            );
        }
      })}
    </FieldGroup>
  );
}

/** One display row: a `dt`/`dd` pair when the field has a label; unlabeled values mount bare. */
function DisplayRow({
  child,
  ctx,
  labeled,
  title,
}: {
  child: FieldChild & { kind: "field" };
  ctx: RenderCtx;
  labeled: boolean;
  /** First unlabeled scalar in a vertical stack — FieldLegend legend, not text-sm. */
  title?: boolean;
}): ReactElement {
  const required = ctx.required[child.surface.id] === true;
  const showLabel = labeled && child.label.length > 0;
  const body = (
    <FieldScope required={required} omitLabel>
      <ctx.Surface {...child.surface} />
    </FieldScope>
  );
  if (!showLabel && title === true) {
    return (
      <FieldLegend variant="legend" className="m-0 min-w-0">
        {body}
      </FieldLegend>
    );
  }
  const Value = showLabel ? "dd" : "div";
  return (
    <>
      {showLabel ? (
        <dt className="text-sm text-muted-foreground">{child.label}</dt>
      ) : null}
      <Value className="m-0 min-w-0 text-sm wrap-break-word">{body}</Value>
    </>
  );
}

/**
 * Display body: contiguous runs of fields collapse into one semantic
 * description list; sections/headings/blocks break the run into their own
 * chrome. Empty optional values are dropped so the list has no blank rows.
 */
function DisplayBody({
  nodes,
  ctx,
}: {
  nodes: readonly FieldChild[];
  ctx: RenderCtx;
}): ReactElement {
  const blocks: ReactNode[] = [];
  let run: (FieldChild & { kind: "field" })[] = [];
  let runId = 0;

  const flush = (): void => {
    if (run.length === 0) return;
    const rows = run;
    run = [];
    const labeled = ctx.labels && rows.some((row) => row.label.length > 0);
    const Container = labeled ? "dl" : "div";
    blocks.push(
      <Container
        key={`dl-${runId++}`}
        className={
          ctx.direction === "horizontal"
            ? labeled
              ? "flex w-full flex-wrap items-start gap-4"
              : "flex w-full min-w-0 flex-wrap items-baseline gap-4"
            : !labeled
              ? "flex min-w-0 flex-col gap-2"
              : ctx.layout === "stack"
                ? "grid grid-cols-1 gap-y-2"
                : "grid grid-cols-1 gap-x-4 gap-y-2 @min-[14rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
        }
      >
        {rows.map((child, index) => {
          const title =
            !labeled &&
            ctx.direction !== "horizontal" &&
            typeof child.surface.data === "string" &&
            index ===
              rows.findIndex(
                (row) =>
                  typeof row.surface.data === "string" &&
                  row.label.length === 0,
              );
          return ctx.direction === "horizontal" ? (
            <div key={child.key} className="min-w-0 flex-1">
              <DisplayRow child={child} ctx={ctx} labeled={labeled} />
            </div>
          ) : (
            <DisplayRow
              key={child.key}
              child={child}
              ctx={ctx}
              labeled={labeled}
              title={title}
            />
          );
        })}
      </Container>,
    );
  };

  for (const child of nodes) {
    if (child.kind === "field") {
      if (child.hidden === true) continue;
      const value = child.surface.data;
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty && ctx.required[child.surface.id] !== true) continue;
      run.push(child);
      continue;
    }
    flush();
    switch (child.kind) {
      case "section": {
        const sectionBody = (
          <SectionChrome
            label={child.label}
            {...(child.description !== undefined
              ? { description: child.description }
              : {})}
          >
            <DisplayBody
              nodes={child.children()}
              ctx={{
                ...ctx,
                direction: child.direction ?? ctx.direction,
                layout: child.layout ?? ctx.layout,
              }}
            />
          </SectionChrome>
        );
        const widget = sectionWidgetName(child);
        blocks.push(
          widget === "separator" ? (
            <div key={child.key} className="flex flex-col gap-3">
              <Separator />
              {sectionBody}
            </div>
          ) : widget === "collapsible" ? (
            <SectionCollapsible key={child.key} child={child}>
              {sectionBody}
            </SectionCollapsible>
          ) : (
            <div key={child.key}>{sectionBody}</div>
          ),
        );
        break;
      }
      case "heading":
        blocks.push(<HeadingChrome key={child.key} label={child.label} />);
        break;
      case "template":
        blocks.push(<TemplateChrome key={child.key} text={child.text} />);
        break;
      case "block":
      case "banner":
      case "span":
        blocks.push(
          <StructuredSlot key={child.key} child={child}>
            <DisplayBody
              nodes={child.children()}
              ctx={{
                ...ctx,
                direction: child.direction ?? ctx.direction,
                layout: child.layout ?? ctx.layout,
              }}
            />
          </StructuredSlot>,
        );
        break;
    }
  }
  flush();

  return (
    <div
      className={
        ctx.direction === "horizontal"
          ? "@container flex flex-row flex-wrap gap-4"
          : "@container flex flex-col gap-4"
      }
    >
      {blocks}
    </div>
  );
}

function StructuredSlot({
  child,
  children,
}: {
  child: FieldChild & { kind: "block" | "banner" | "span" };
  children: ReactNode;
}): ReactElement {
  const common = {
    ...(child.label !== undefined ? { label: child.label } : {}),
    ...(child.description !== undefined
      ? { description: child.description }
      : {}),
    ...(child.text !== undefined ? { text: child.text } : {}),
  };
  if (child.kind === "banner")
    return <BannerChrome {...common}>{children}</BannerChrome>;
  if (child.kind === "span")
    return (
      <SpanChrome
        {...common}
        {...(child.direction !== undefined
          ? { direction: child.direction }
          : {})}
      >
        {children}
      </SpanChrome>
    );
  return <BlockChrome {...common}>{children}</BlockChrome>;
}

/**
 * Default editor for an additionalProperties map: a JSON textarea. Annotate
 * `widget: { name: "code", language: "json" }` to opt into CodeMirror.
 */
function OpenMapInput({ data }: { readonly data: unknown }): ReactElement {
  const { dataApi } = useSurface();
  const formatted = formatCode(data, true);
  const [draft, setDraft] = useState(formatted);
  const [issue, setIssue] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef(formatted);
  const { field, resetVersion } = useDraftField(issue, touched);

  useEffect(() => {
    setDraft(formatted);
    setIssue(undefined);
    setTouched(false);
    lastEmitted.current = formatted;
  }, [resetVersion]);

  useEffect(() => {
    if (formatted === lastEmitted.current) return;
    setDraft(formatted);
    setIssue(undefined);
    lastEmitted.current = formatted;
  }, [formatted]);

  const commit = (text: string): void => {
    if (field.readOnly) return;
    setDraft(text);
    const result = parseCode(text, true);
    if (result.kind === "empty") {
      setIssue(undefined);
      lastEmitted.current = "";
      dataApi?.setData(undefined);
      return;
    }
    if (result.kind === "issue") {
      setIssue(result.message);
      return;
    }
    setIssue(undefined);
    lastEmitted.current = formatCode(result.data, true);
    dataApi?.setData(result.data);
  };

  return (
    <FieldChrome state={field}>
      <Textarea
        id={field.controlId}
        aria-label={
          field.showLabels && field.label.length > 0
            ? undefined
            : field.label || "JSON"
        }
        value={draft}
        rows={8}
        readOnly={field.readOnly}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.describedBy}
        spellCheck={false}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setTouched(true);
          commit(event.currentTarget.value);
        }}
      />
    </FieldChrome>
  );
}

function OpenMapDisplay({ data }: { readonly data: unknown }): ReactElement {
  const fs = useFieldState();
  const text = formatCode(data, true);
  return (
    <FieldChrome state={fs}>
      <span className="text-sm whitespace-pre-wrap">{text}</span>
    </FieldChrome>
  );
}

/** Object form body (input mode). The root form shell is the kit's Root. */
export function ObjectInput(): ReactElement {
  const { schema, data, helpers, isRoot, id, dataApi, Surface, labels, view } =
    useSurface();
  const fieldState = useFieldState();
  if (helpers === undefined || Surface === undefined || !isRecord(schema)) {
    return <Fallback id="" />;
  }
  // Invalid parent values are values, not missing objects. Mounting children
  // here would let their defaults silently replace null/false/zero/string.
  if (data !== undefined && !isRecord(data)) {
    return (
      <FieldSet>
        <FieldError>
          Expected an object; replace the current value before editing its
          fields.
        </FieldError>
        <pre className="text-sm">{JSON.stringify(data)}</pre>
      </FieldSet>
    );
  }
  if (isOpenMap(schema)) return <OpenMapInput data={data} />;

  const title = helpers.label();
  const description = helpers.description();
  const showTitle =
    fieldState.showLabels && showsObjectTitle(isRoot, id, title);
  const ctx: RenderCtx = {
    required: requiredNames(schema),
    readOnly: fieldState.readOnly,
    labels: labels !== false,
    layout: helpers.layout(),
    direction: helpers.direction(),
    Surface,
    setChild: dataApi?.setChild.bind(dataApi),
  };

  return (
    <FieldScope readOnly={fieldState.readOnly}>
      <FieldSet key={view} className="min-w-0">
        {showTitle ? <FieldLegend variant="label">{title}</FieldLegend> : null}
        {description.length > 0 ? (
          <FieldDescription id={`${fieldState.controlId}-description`}>
            {description}
          </FieldDescription>
        ) : null}
        <InputBody nodes={helpers.fields()} ctx={ctx} />
      </FieldSet>
    </FieldScope>
  );
}

/**
 * Object read-only body. `layout: "props"` renders a semantic description
 * list; child surfaces mount with labels suppressed so the `dt` owns the label.
 */
export function ObjectDisplay(): ReactElement {
  const { schema, data, helpers, isRoot, id, Surface, labels, view } =
    useSurface();
  const fieldState = useFieldState();
  if (helpers === undefined || Surface === undefined || !isRecord(schema)) {
    return <Fallback id="" />;
  }
  if (isOpenMap(schema)) return <OpenMapDisplay data={data} />;

  const title = helpers.label();
  const description = helpers.description();
  const showTitle =
    fieldState.showLabels && showsObjectTitle(isRoot, id, title);
  const ctx: RenderCtx = {
    required: requiredNames(schema),
    readOnly: true,
    labels: labels !== false,
    layout: helpers.layout(),
    direction: helpers.direction(),
    Surface,
    setChild: undefined,
  };

  const body = <DisplayBody nodes={helpers.fields()} ctx={ctx} />;
  if (!showTitle && description.length === 0) return body;

  return (
    <FieldSet key={view} className="min-w-0">
      {showTitle ? <FieldLegend variant="label">{title}</FieldLegend> : null}
      {description.length > 0 ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {body}
    </FieldSet>
  );
}
