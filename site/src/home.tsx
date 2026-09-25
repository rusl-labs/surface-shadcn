import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
  type SurfaceComponent,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { SurfaceProvider, shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { ArrowUpRight, Check, Copy, FileCode, Terminal } from "lucide-react";
import { createShadcnKit } from "../../registry/surface/kit";
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
import { ProfileCard } from "./profile-card";
import profileCardSource from "./profile-card.tsx?raw";
import {
  PROFILE_ID,
  initialProfile,
  isProfile,
  profileAnnotation,
  profileSchema,
  type Profile,
} from "./profile";

const REPOSITORY = "https://github.com/rusl-labs/surface-shadcn";
const SURFACE = "https://github.com/rusl-labs/surface";
const ANNOTATION_REFERENCE = `${SURFACE}/blob/HEAD/docs/annotation.md`;
const WIDGET_VOCABULARY = `${REPOSITORY}/blob/HEAD/schemas/rusl/surface.shadcn.schema.json`;
const INSTALL_ARGS = "shadcn@latest add rusl-labs/surface-shadcn/surface";

type Mode = "input" | "display";

const viewGroups: readonly {
  readonly mode: Mode;
  readonly title: string;
  readonly views: readonly string[];
}[] = [
  { mode: "input", title: "Input", views: ["default", "compact", "details"] },
  {
    mode: "display",
    title: "Display",
    views: ["identity", "row", "card", "details"],
  },
];

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

const annotationKeys: readonly { readonly key: string; readonly does: string }[] = [
  { key: "views", does: "Named presentations. Other views inherit field settings from default." },
  { key: "fields", does: "The fields to show, in order. An entry with fields and no name is a section." },
  { key: "label, description", does: "Text for a field or section. An empty label hides it." },
  { key: "widget", does: "The renderer for a field or section." },
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

const usageCode = `import { Surface } from "@/components/surface"

<Surface id={schema} onSubmit={({ data }) => console.log(data)} />

<Surface id={schema} data={profile} mode="display" view="card" />`;

const profileFiles: readonly SourceFile[] = [
  {
    title: "components/profile.tsx",
    code: `"use client"

import * as React from "react"

import { Surface } from "@/components/surface"

const schema = "${PROFILE_ID}"

export function Profile() {
  const [profile, setProfile] = React.useState<unknown>()

  return (
    <>
      <Surface id={schema} data={profile} onChange={setProfile} view="compact" />
      <Surface id={schema} data={profile} mode="display" view="identity" />
      <Surface id={schema} data={profile} mode="display" view="row" />
      <Surface id={schema} data={profile} mode="display" view="card" />
    </>
  )
}`,
  },
  {
    title: "schemas/profile.schema.json",
    code: JSON.stringify(profileSchema, null, 2),
  },
  {
    title: "schemas/profile.annotation.json",
    code: JSON.stringify(profileAnnotation, null, 2),
  },
];

const resolversCode = `import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
} from "@rusl-labs/surface"
import { shadcnSchemas } from "@rusl-labs/surface-shadcn"

import profileAnnotation from "@/schemas/profile.annotation.json"
import profileSchema from "@/schemas/profile.schema.json"

export const schemaResolver = new InMemorySchemaFetchResolver({
  ...shadcnSchemas,
  [profileSchema.$id]: profileSchema,
})

export const annotationResolver = new InMemoryAnnotationResolver({
  [profileAnnotation.subject]: profileAnnotation,
})`;

const cardFiles: readonly SourceFile[] = [
  {
    title: "components/surface/index.tsx",
    code: `"use client"

import { createSurfaceUi } from "@rusl-labs/surface"
import { createAjvValidator } from "@rusl-labs/surface-ajv"

import { ProfileCard } from "@/components/profile-card"
import { createShadcnKit } from "./kit"
import { annotationResolver, schemaResolver } from "./resolvers"

export { SurfaceProvider } from "@rusl-labs/surface-shadcn"

export const { Surface } = createSurfaceUi({
  schemaResolver,
  annotationResolver,
  validator: createAjvValidator(),
  kit: createShadcnKit({
    resolvers: [
      {
        key: "${PROFILE_ID}",
        mode: "display",
        view: "card",
        component: ProfileCard,
      },
    ],
  }),
})`,
  },
  {
    title: "components/profile-card.tsx",
    code: profileCardSource.trimEnd(),
  },
  {
    title: "Usage",
    code: `<Surface id={schema} data={profile} mode="display" view="card" />`,
  },
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
  return (
    <figure className="overflow-hidden rounded-xl border bg-muted/40">
      <figcaption className="flex h-10 items-center gap-2 border-b pr-1.5 pl-4 text-muted-foreground">
        <FileCode className="size-4" />
        <span className="flex-1 truncate font-mono text-xs">{title}</span>
        <CopyButton value={code} />
      </figcaption>
      <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
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
  files,
}: {
  children: ReactNode;
  files: readonly SourceFile[];
}) {
  return (
    <Tabs defaultValue="preview" className="gap-4">
      <TabsList variant="line">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
      <TabsContent value="preview">
        <div className="rounded-xl border p-6 md:p-8">{children}</div>
      </TabsContent>
      <TabsContent value="code" className="flex flex-col gap-4">
        {files.map((file) => (
          <CodeBlock key={file.title} {...file} />
        ))}
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

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
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

function ViewBrowser({
  Surface,
  profile,
  onChange,
}: {
  Surface: SurfaceComponent;
  profile: Profile;
  onChange: (data: unknown) => void;
}) {
  const [selected, setSelected] = useState<{ mode: Mode; view: string }>({
    mode: "input",
    view: "default",
  });
  const surface = (
    <Surface
      key={`${selected.mode}:${selected.view}`}
      id={PROFILE_ID}
      data={profile}
      mode={selected.mode}
      view={selected.view}
      onChange={onChange}
      onSubmit={({ data }) => onChange(data)}
    />
  );

  return (
    <div className="grid gap-8 md:grid-cols-[9rem_minmax(0,1fr)]">
      <nav aria-label="Views" className="flex flex-col gap-5">
        {viewGroups.map((group) => (
          <div key={group.mode} className="flex flex-col gap-1.5">
            <p className="px-2.5 text-xs font-medium text-muted-foreground">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {group.views.map((view) => {
                const active =
                  selected.mode === group.mode && selected.view === view;
                return (
                  <Button
                    key={view}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start font-mono text-xs font-normal"
                    aria-pressed={active}
                    onClick={() => setSelected({ mode: group.mode, view })}
                  >
                    {view}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="min-h-72">
          {selected.mode === "display" && selected.view === "card" ? (
            <div className="max-w-xs rounded-xl border p-5">{surface}</div>
          ) : (
            surface
          )}
        </div>
        <CodeBlock
          title={`profile.annotation.json → views.${selected.view}`}
          code={JSON.stringify(profileAnnotation.views?.[selected.view], null, 2)}
        />
      </div>
    </div>
  );
}

function Homepage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const { Surface, WithProfileCard } = useMemo(() => {
    const schemaResolver = new InMemorySchemaFetchResolver({
      ...shadcnSchemas,
      [PROFILE_ID]: profileSchema,
    });
    const annotationResolver = new InMemoryAnnotationResolver({
      [PROFILE_ID]: profileAnnotation,
    });
    return {
      Surface: createSurfaceUi({
        schemaResolver,
        annotationResolver,
        validator: createAjvValidator(),
        kit: createShadcnKit(),
      }).Surface,
      WithProfileCard: createSurfaceUi({
        schemaResolver,
        annotationResolver,
        validator: createAjvValidator(),
        kit: createShadcnKit({
          resolvers: [
            {
              key: PROFILE_ID,
              mode: "display",
              view: "card",
              component: ProfileCard,
            },
          ],
        }),
      }).Surface,
    };
  }, []);
  const onChange = (data: unknown) => {
    if (isProfile(data)) setProfile(data);
  };

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

        <ComponentPreview files={profileFiles}>
          <ViewBrowser Surface={Surface} profile={profile} onChange={onChange} />
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
            <InlineCode>subject</InlineCode>.
          </p>
          <CodeBlock title="components/surface/resolvers.ts" code={resolversCode} />
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
            fields. To take over a view with your own component, register it for
            a schema, mode, and view in{" "}
            <InlineCode>components/surface/index.tsx</InlineCode>. The component
            replaces the annotation for that view only.
          </p>
          <ComponentPreview files={cardFiles}>
            <div className="grid items-start gap-8 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Caption>Annotation</Caption>
                <div className="max-w-xs rounded-xl border p-5">
                  <Surface
                    id={PROFILE_ID}
                    data={profile}
                    mode="display"
                    view="card"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Caption>Registered component</Caption>
                <WithProfileCard
                  id={PROFILE_ID}
                  data={profile}
                  mode="display"
                  view="card"
                />
              </div>
            </div>
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
