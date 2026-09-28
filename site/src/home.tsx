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
import { CardViews } from "./examples/card-views";
import cardViewsSource from "./examples/card-views.tsx?raw";
import profileCardSource from "./examples/profile-card.tsx?raw";
import { ProfileViews } from "./examples/profile-views";
import profileViewsSource from "./examples/profile-views.tsx?raw";
import annotationSource from "./examples/profile.annotation.json?raw";
import sampleSource from "./examples/profile.sample.json?raw";
import schemaSource from "./examples/profile.schema.json?raw";

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
  title: `${EXAMPLES}/profile.annotation.json`,
  code: annotationSource,
};

const profileFiles: readonly SourceFile[] = [
  { title: `${EXAMPLES}/profile-views.tsx`, code: profileViewsSource },
  { title: `${EXAMPLES}/profile.schema.json`, code: schemaSource },
  { title: `${EXAMPLES}/profile.sample.json`, code: sampleSource },
];

const cardFiles: readonly SourceFile[] = [
  { title: `${EXAMPLES}/card-views.tsx`, code: cardViewsSource },
  { title: `${EXAMPLES}/profile-card.tsx`, code: profileCardSource },
];

const usageCode = `import { Surface } from "@/components/surface"

<Surface id={schemaId} mode="input" view="default" onSubmit={({ data }) => console.log(data)} />

<Surface id={schemaId} mode="display" view="card" data={record} />`;

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
  { names: ["tooltip", "separator"], on: "field, section", renders: "Tooltip, Separator" },
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
  annotation: SourceFile;
}) {
  return (
    <Tabs defaultValue="preview" className="gap-4">
      <TabsList variant="line">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
        <TabsTrigger value="annotation">Annotation</TabsTrigger>
      </TabsList>
      <TabsContent value="preview" keepMounted>
        <div className="rounded-xl border p-6 md:p-8">{children}</div>
      </TabsContent>
      <TabsContent value="code" className="flex flex-col gap-4">
        {code.map((file) => (
          <CodeBlock key={file.title} {...file} />
        ))}
      </TabsContent>
      <TabsContent value="annotation">
        <CodeBlock {...annotation} />
      </TabsContent>
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
          <a href="#annotations" className="hover:text-foreground">
            Annotations
          </a>
          <a href="#views" className="hover:text-foreground">
            Views
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
            surface-shadcn
          </h1>
          <p className="text-muted-foreground">
            The shadcn/ui kit for{" "}
            <TextLink href={SURFACE}>Surface</TextLink>. It renders a JSON
            Schema as forms and displays with your own components. One
            annotation defines every view.
          </p>
          <div className="flex flex-wrap gap-2">
            <ExternalBadge href={SURFACE}>Surface</ExternalBadge>
            <ExternalBadge href={ANNOTATION_REFERENCE}>
              Annotation reference
            </ExternalBadge>
          </div>
        </div>

        <ComponentPreview code={profileFiles} annotation={annotationFile}>
          <ProfileViews />
        </ComponentPreview>

        <section className="flex flex-col gap-4">
          <SectionHeading id="installation">Installation</SectionHeading>
          <CommandBlock args={INSTALL_ARGS} />
          <p className="text-muted-foreground">
            This adds the renderers to{" "}
            <InlineCode>components/surface</InlineCode> and installs{" "}
            <InlineCode>@rusl-labs/surface</InlineCode>, the AJV validator, and
            the shadcn components they use.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="usage">Usage</SectionHeading>
          <p className="text-muted-foreground">
            <InlineCode>id</InlineCode> is the schema{" "}
            <InlineCode>$id</InlineCode>. <InlineCode>mode</InlineCode> is{" "}
            <InlineCode>input</InlineCode> or <InlineCode>display</InlineCode>.{" "}
            <InlineCode>view</InlineCode> names a view in the annotation.
            Schemas that are not registered locally are fetched from their URL.
          </p>
          <CodeBlock title="app/page.tsx" code={usageCode} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="annotations">Annotations</SectionHeading>
          <p className="text-muted-foreground">
            An annotation is a JSON document for one schema. It names views and
            lists each view's fields, labels, sections, and widgets. The schema
            stays the data contract. See the{" "}
            <TextLink href={ANNOTATION_REFERENCE}>annotation reference</TextLink>
            .
          </p>
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
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="views">Views</SectionHeading>
          <p className="text-muted-foreground">
            A view is a named presentation, such as{" "}
            <InlineCode>default</InlineCode>, <InlineCode>row</InlineCode>, or{" "}
            <InlineCode>card</InlineCode>. The annotation defines each view's
            fields. To take over a view with your own component, pass it to{" "}
            <InlineCode>createShadcnKit</InlineCode> with a schema, mode, and
            view. The component replaces the annotation for that view only.
          </p>
          <ComponentPreview code={cardFiles} annotation={annotationFile}>
            <CardViews />
          </ComponentPreview>
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
