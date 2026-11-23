import { useEffect, useState, type ReactNode } from "react";
import { SurfaceProvider } from "@rusl-labs/surface-shadcn";
import { ArrowUpRight, Check, Copy, FileCode, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import resolversSource from "../../registry/surface/resolvers.ts?raw";
import { CardViews, ReferenceViews, ContextViews } from "./examples/card-views";
import cardViewsSource from "./examples/card-views.tsx?raw";
import profileCardSource from "./examples/profile-card.tsx?raw";
import profileComponentsSource from "./examples/profile-components.tsx?raw";
import { EventViews } from "./examples/event-views";
import eventViewsSource from "./examples/event-views.tsx?raw";
import eventSchemaSource from "./examples/event.schema.json?raw";
import annotationSource from "./examples/event.annotation.json?raw";
import sampleSource from "./examples/profile.sample.json?raw";
import schemaSource from "./examples/profile.schema.json?raw";
import { Playground } from "./playground";

const REPOSITORY = "https://github.com/rusl-labs/surface-shadcn";
const SURFACE = "https://github.com/rusl-labs/surface";
const ANNOTATION_REFERENCE = `${SURFACE}/blob/HEAD/docs/annotation.md`;
const WIDGET_VOCABULARY = `${REPOSITORY}/blob/HEAD/schemas/rusl/surface.shadcn.schema.json`;
const INSTALL_ARGS = "shadcn@latest add rusl-labs/surface-shadcn/surface";
const EXAMPLES = "site/src/examples";

const managers = {
  pnpm: "pnpm dlx",
  npm: "npx",
  yarn: "yarn",
  bun: "bunx --bun",
} as const;

type Manager = keyof typeof managers;

interface SourceFile {
  readonly title: string;
  readonly code: string;
}

const annotationFile: SourceFile = {
  title: `${EXAMPLES}/event.annotation.json`,
  code: annotationSource,
};

const eventFiles: readonly SourceFile[] = [
  { title: `${EXAMPLES}/event-views.tsx`, code: eventViewsSource },
  { title: `${EXAMPLES}/event.schema.json`, code: eventSchemaSource },
];

const cardFiles: readonly SourceFile[] = [
  { title: `${EXAMPLES}/card-views.tsx`, code: cardViewsSource },
  { title: `${EXAMPLES}/profile-card.tsx`, code: profileCardSource },
  { title: `${EXAMPLES}/profile-components.tsx`, code: profileComponentsSource },
  { title: `${EXAMPLES}/profile.schema.json`, code: schemaSource },
  { title: `${EXAMPLES}/profile.sample.json`, code: sampleSource },
];

const usageCode = `// Register components by data type, mode, and your own view name.
const kit = createShadcnKit({ resolvers: [
  { key: profileType, mode: "display", view: "byline", component: ProfileByline },
  { key: profileType, mode: "input", view: "edit", component: ProfileEdit },
] })

const { Surface } = createSurfaceUi({ schemaResolver, validator, kit })

<Surface id={profileType} mode="display" view="byline" data={profile} />
<Surface id={profileType} mode="input" view="edit" data={profile} onChange={setProfile} />`;

const referenceCode = `// Register a named view for the definition.
const kit = createShadcnKit({ resolvers: [
  {
    key: profileType + "#/$defs/photo",
    mode: "display",
    view: "avatar",
    component: ProfilePhoto,
  },
] })

// Inside ProfileIdentity, use the configured Surface from context.
const { Surface } = useSurface()

<Surface
  id="photo"
  schema={{ $ref: "#/$defs/photo" }}
  mode="display"
  view="avatar"
  data={data.photo}
/>`;

const annotationKeys: readonly { readonly key: string; readonly does: string }[] = [
  { key: "views", does: "Named presentations. Other views inherit field settings from default." },
  { key: "fields", does: "The fields to show, in order. An entry with fields and no name is a section." },
  { key: "label, description", does: "Text for a field or section. An empty label hides it." },
  { key: "widget", does: "The renderer for a field or section. null clears an inherited widget." },
  { key: "input, display", does: "Settings that apply in one mode only." },
  { key: "layout", does: "props puts the label beside the value; stack puts it above." },
  { key: "direction", does: "vertical or horizontal." },
  { key: "rest", does: "append or omit properties the view does not list." },
  { key: "template", does: "Text with {{field}} values from the data." },
];

const widgets: readonly {
  readonly names: readonly string[];
  readonly on: string;
  readonly renders: string;
}[] = [
  { names: ["input", "email"], on: "string", renders: "Input" },
  { names: ["textarea"], on: "string", renders: "Textarea" },
  { names: ["date", "datetime"], on: "string", renders: "Calendar, Popover" },
  { names: ["tel"], on: "phone", renders: "Combobox, Input Group" },
  { names: ["money"], on: "money", renders: "Combobox, Input Group" },
  { names: ["combobox"], on: "enum", renders: "Combobox" },
  { names: ["radio-group"], on: "enum", renders: "Radio Group" },
  { names: ["toggle-group"], on: "enum", renders: "Toggle Group" },
  { names: ["switch"], on: "boolean", renders: "Switch" },
  { names: ["table"], on: "array", renders: "Table" },
  { names: ["list", "carousel"], on: "array", renders: "List rows, Carousel" },
  { names: ["accordion", "collapsible"], on: "object", renders: "Accordion, Collapsible" },
  { names: ["code"], on: "object", renders: "CodeMirror" },
  { names: ["media", "avatar"], on: "image", renders: "Card, Avatar" },
  { names: ["tooltip"], on: "field", renders: "Tooltip" },
  { names: ["separator"], on: "heading, section", renders: "Separator (local Surface patch)" },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Copied" : "Copy"}
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

function CodeBlock({ title, code }: SourceFile) {
  const source = code.trimEnd();
  return (
    <figure className="overflow-hidden rounded-xl border bg-muted/40">
      <figcaption className="flex h-10 items-center gap-2 border-b pr-1.5 pl-4 text-muted-foreground">
        <FileCode className="size-4" />
        <span className="flex-1 truncate font-mono text-xs">{title}</span>
        <CopyButton value={source} />
      </figcaption>
      <pre className="max-h-[480px] overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{source}</code>
      </pre>
    </figure>
  );
}

function CommandBlock({ args }: { args: string }) {
  const [manager, setManager] = useState<Manager>("pnpm");
  const command = `${managers[manager]} ${args}`;
  return (
    <div className="overflow-hidden rounded-xl border bg-muted/40">
      <Tabs
        value={manager}
        onValueChange={(value) => setManager(value as Manager)}
        className="gap-0"
      >
        <div className="flex h-10 items-center gap-2 border-b pr-1.5 pl-4">
          <Terminal className="size-4 text-muted-foreground" />
          <TabsList variant="line" className="h-10 p-0">
            {(Object.keys(managers) as Manager[]).map((name) => (
              <TabsTrigger key={name} value={name} className="font-mono text-xs">
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="ml-auto">
            <CopyButton value={command} />
          </div>
        </div>
      </Tabs>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{command}</code>
      </pre>
    </div>
  );
}

function ComponentPreview({
  children,
  code,
  annotation,
}: {
  children: ReactNode;
  code: readonly SourceFile[];
  annotation?: SourceFile;
}) {
  return (
    <Tabs defaultValue="preview" className="gap-4">
      <TabsList variant="line">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
        {annotation && <TabsTrigger value="annotation">Annotation</TabsTrigger>}
      </TabsList>
      <TabsContent value="preview" keepMounted>
        <div className="rounded-xl border p-6 md:p-8">{children}</div>
      </TabsContent>
      <TabsContent value="code" className="flex flex-col gap-4">
        {code.map((file) => (
          <CodeBlock key={file.title} {...file} />
        ))}
      </TabsContent>
      {annotation && <TabsContent value="annotation">
        <CodeBlock {...annotation} />
      </TabsContent>}
    </Tabs>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
        <a href="#" className="text-sm font-semibold">
          surface-shadcn
        </a>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <a href="#installation" className="hover:text-foreground">
            Installation
          </a>
          <a href="#usage" className="hover:text-foreground">
            Usage
          </a>
          <a href="#views" className="hover:text-foreground">
            Named views
          </a>
          <a href="#annotations" className="hover:text-foreground">
            Dynamic rendering
          </a>
          <a href="#playground" className="hover:text-foreground">
            Playground
          </a>
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label="GitHub"
          nativeButton={false}
          render={<a href={REPOSITORY} />}
        >
          <GitHubIcon />
        </Button>
      </div>
    </header>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-m-20 text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-4 text-lg font-semibold tracking-tight">{children}</h3>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
      {children}
    </code>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-medium text-foreground underline underline-offset-4"
    >
      {children}
    </a>
  );
}

function ExternalBadge({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Badge variant="secondary" render={<a href={href} />}>
      {children}
      <ArrowUpRight data-icon="inline-end" />
    </Badge>
  );
}

function ReferenceTable({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((column) => (
              <TableHead key={column} className="px-4">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, row) => (
            <TableRow key={row}>
              {cells.map((cell, column) => (
                <TableCell
                  key={column}
                  className={
                    column === 0
                      ? "px-4 align-top"
                      : "px-4 align-top whitespace-normal text-muted-foreground"
                  }
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CodeNames({ names }: { names: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <InlineCode key={name}>{name}</InlineCode>
      ))}
    </span>
  );
}

function Homepage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 pt-10 pb-24">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            One Surface. Many views.
          </h1>
          <p className="text-muted-foreground">
            One interface for typed data, input or display. Bring your own
            components or fall back to dynamic rendering—in your app or agent chat.
          </p>
          <div className="flex flex-wrap gap-2">
            <ExternalBadge href={SURFACE}>Surface</ExternalBadge>
            <ExternalBadge href={REPOSITORY}>Get the shadcn/ui kit</ExternalBadge>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <SectionHeading id="views">Your data. Your views.</SectionHeading>
          <p className="text-muted-foreground">
            JSON Schema defines your data types. You name the views: identity,
            card, row, or anything your app needs. Here are a few for a profile.
          </p>
          <ComponentPreview code={cardFiles}>
            <CardViews />
          </ComponentPreview>
          <p className="text-sm text-muted-foreground">
            One interface to render them. One place to update them.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="references">Reuse types, not just whole screens.</SectionHeading>
          <p className="text-muted-foreground">
            A <InlineCode>$ref</InlineCode> isn't just an instruction to inline fields.
            Surface resolves the referenced type and can select its registered
            component—even inside another view. Define it once in <InlineCode>$defs</InlineCode>,
            then reuse it.
          </p>
          <ReferenceViews />
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">See the reference and registration</summary>
            <div className="mt-4 grid gap-4">
              <CodeBlock title="profile.schema.json" code={schemaSource} />
              <CodeBlock title="Register the definition, render the reference" code={referenceCode} />
            </div>
          </details>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="contexts">Your app and agents. The same views.</SectionHeading>
          <p className="text-muted-foreground">
            Both contexts render the same registered identity view. Update the
            component once, and both change with it.
          </p>
          <ContextViews />
          <p className="text-sm text-muted-foreground">Illustrative chat UI—not a separate agent-generated component.</p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="installation">Installation</SectionHeading>
          <p className="text-muted-foreground">
            Requires React 19, Tailwind CSS v4, and shadcn/ui set up for Base
            UI. For a new app, run{" "}
            <InlineCode>npx shadcn@latest init --base base</InlineCode> first.
          </p>
          <CommandBlock args={INSTALL_ARGS} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="usage">Usage</SectionHeading>
          <CodeBlock title="app/page.tsx" code={usageCode} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="annotations">No custom view? Go dynamic.</SectionHeading>
          <p className="text-muted-foreground">
            No event component registered here. Surface uses the schema and
            annotations to shape the same display views—identity, row, card,
            and byline—plus full and focused input forms. Same data, different
            fields, layout, and widgets.
          </p>
          <ComponentPreview code={eventFiles} annotation={annotationFile}>
            <EventViews />
          </ComponentPreview>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">Annotation &amp; widget reference</summary>
            <div className="mt-4 flex flex-col gap-4">
          <TextLink href={ANNOTATION_REFERENCE}>Full annotation reference</TextLink>
          <ReferenceTable
            columns={["Key", "What it does"]}
            rows={annotationKeys.map((row) => [
              <CodeNames key={row.key} names={row.key.split(", ")} />,
              row.does,
            ])}
          />
          <p className="text-muted-foreground">
            Register schemas and annotations in{" "}
            <InlineCode>components/surface/resolvers.ts</InlineCode>. Surface
            matches an annotation to a schema by its{" "}
            <InlineCode>subject</InlineCode>. The block installs this file:
          </p>
          <CodeBlock
            title="components/surface/resolvers.ts"
            code={resolversSource}
          />
          <SubHeading>Widgets</SubHeading>
          <p className="text-muted-foreground">
            Set <InlineCode>widget.name</InlineCode> on a field. The names come
            from the kit's{" "}
            <TextLink href={WIDGET_VOCABULARY}>widget vocabulary</TextLink>.
          </p>
          <ReferenceTable
            columns={["Widget", "Use on", "Renders"]}
            rows={widgets.map((widget) => [
              <CodeNames key={widget.names.join()} names={widget.names} />,
              widget.on,
              widget.renders,
            ])}
          />
            </div>
          </details>
          <p className="text-sm text-muted-foreground">
            Building with an agent? <TextLink href={`${import.meta.env.BASE_URL}llms.txt`}>llms.txt</TextLink>
          </p>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <SectionHeading id="playground">Playground</SectionHeading>
          <p className="text-muted-foreground">
            Your schema, annotations, and data. Edit the JSON and see Surface respond.
          </p>
          <Playground />
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <SurfaceProvider locale="en-US" defaultCountry="US" defaultCurrency="USD">
      <Homepage />
    </SurfaceProvider>
  );
}
