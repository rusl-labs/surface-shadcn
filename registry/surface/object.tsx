"use client";

import type { ReactElement, ReactNode } from "react";
import {
  useSurface,
  type FieldChild,
  type FieldDirection,
  type FieldLayout,
  type SurfaceComponent,
} from "@rusl-labs/surface";
import {
  FieldScope,
  isRecord,
  seedValue,
  useFieldState,
} from "@rusl-labs/surface-shadcn";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  BannerChrome,
  BlockChrome,
  HeadingChrome,
  SectionChrome,
  SpanChrome,
  TemplateChrome,
} from "./chrome";
import { Fallback } from "./fallback";

interface RenderCtx {
  readonly required: Readonly<Record<string, true>>;
  readonly readOnly: boolean;
  readonly labels: boolean;
  readonly layout: FieldLayout;
  readonly direction: FieldDirection;
  readonly Surface: SurfaceComponent;
  /** Parent object's data channel — presence toggles write child slots here. */
  readonly setChild:
    | ((key: string | number, next: unknown) => void)
    | undefined;
}

/**
 * Whether this object mount paints its own title/description.
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
  const noun = child.label.length > 0 ? child.label : name;
  const addLabel =
    child.entry?.addLabel !== undefined && child.entry.addLabel.length > 0
      ? child.entry.addLabel
      : `Add ${noun}`;

  const mounted = (
    <FieldScope required={required}>
      <ctx.Surface {...child.surface} />
    </FieldScope>
  );

  if (toggle && !present) {
    return (
      <div className="flex flex-col gap-2">
        {ctx.labels && child.label.length > 0 ? (
          <FieldLabel>{child.label}</FieldLabel>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={ctx.readOnly}
          onClick={() => {
            ctx.setChild?.(name, seedValue(child.surface.schema ?? {}) ?? {});
          }}
        >
          {addLabel}
        </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={ctx.readOnly}
            aria-label={`Remove ${noun}`}
            onClick={() => {
              ctx.setChild?.(name, undefined);
            }}
          >
            Remove
          </Button>
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
          case "section":
            return (
              <SectionChrome
                key={child.key}
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

/** One display row: a `dt`/`dd` pair; the value mounts with labels suppressed. */
function DisplayRow({
  child,
  ctx,
}: {
  child: FieldChild & { kind: "field" };
  ctx: RenderCtx;
}): ReactElement {
  const required = ctx.required[child.surface.id] === true;
  const Value = ctx.labels ? "dd" : "div";
  return (
    <>
      {ctx.labels ? (
        <dt className="text-sm text-muted-foreground">{child.label}</dt>
      ) : null}
      <Value className="m-0 min-w-0 text-sm wrap-break-word">
        <FieldScope required={required} omitLabel>
          <ctx.Surface {...child.surface} />
        </FieldScope>
      </Value>
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
    const Container = ctx.labels ? "dl" : "div";
    blocks.push(
      <Container
        key={`dl-${runId++}`}
        className={
          !ctx.labels
            ? "flex flex-col gap-2"
            : ctx.layout === "stack"
              ? "grid grid-cols-1 gap-y-2"
              : "grid grid-cols-1 gap-x-4 gap-y-2 @min-[14rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
        }
      >
        {rows.map((child) => (
          <DisplayRow key={child.key} child={child} ctx={ctx} />
        ))}
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
      case "section":
        blocks.push(
          <SectionChrome
            key={child.key}
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
          </SectionChrome>,
        );
        break;
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

/** Object form body (input mode). The root form shell is the kit's Root. */
export function ObjectInput(): ReactElement {
  const { schema, helpers, isRoot, id, dataApi, Surface, labels } =
    useSurface();
  const fieldState = useFieldState();
  if (helpers === undefined || Surface === undefined || !isRecord(schema)) {
    return <Fallback id="" />;
  }

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
    <FieldScope readOnly={schema.readOnly === true}>
      <FieldSet className="min-w-0">
        {showTitle ? <FieldLegend variant="label">{title}</FieldLegend> : null}
        {showTitle && description.length > 0 ? (
          <FieldDescription>{description}</FieldDescription>
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
  const { schema, helpers, isRoot, id, Surface, labels } = useSurface();
  const fieldState = useFieldState();
  if (helpers === undefined || Surface === undefined || !isRecord(schema)) {
    return <Fallback id="" />;
  }

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
  if (!showTitle) return body;

  return (
    <FieldSet className="min-w-0">
      <FieldLegend variant="label">{title}</FieldLegend>
      {description.length > 0 ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      {body}
    </FieldSet>
  );
}
