import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { SurfaceProvider, shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { Check, Copy, FileCode, Terminal } from "lucide-react";
import { createShadcnKit } from "../../registry/surface/kit";
import { Button } from "@/components/ui/button";
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
const INSTALL_ARGS = "shadcn@latest add rusl-labs/surface-shadcn/surface";

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

const usageCode = `import { Surface } from "@/components/surface"

<Surface id={schema} onSubmit={({ data }) => console.log(data)} />

<Surface id={schema} data={profile} mode="display" />`;

const profileFiles: readonly SourceFile[] = [
  {
    title: "components/profile-form.tsx",
    code: `"use client"

import * as React from "react"

import { Surface } from "@/components/surface"

const schema = "${PROFILE_ID}"

export function ProfileForm() {
  const [profile, setProfile] = React.useState<unknown>()

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Surface
        id={schema}
        data={profile}
        onChange={setProfile}
        onSubmit={({ data }) => console.log(data)}
      />
      <Surface id={schema} data={profile} mode="display" />
    </div>
  )
}`,
  },
  {
    title: "components/surface/resolvers.ts",
    code: `import {
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
})`,
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
        <div className="rounded-xl border p-6 md:p-10">{children}</div>
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
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-6">
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

function Homepage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const { Surface } = useMemo(
    () =>
      createSurfaceUi({
        schemaResolver: new InMemorySchemaFetchResolver({
          ...shadcnSchemas,
          [PROFILE_ID]: profileSchema,
        }),
        annotationResolver: new InMemoryAnnotationResolver({
          [PROFILE_ID]: profileAnnotation,
        }),
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
      }),
    [],
  );

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pt-10 pb-24">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            surface-shadcn
          </h1>
          <p className="text-muted-foreground">
            Forms and displays for JSON Schema, built from your shadcn
            components.
          </p>
        </div>

        <ComponentPreview files={profileFiles}>
          <div className="grid items-start gap-10 md:grid-cols-2">
            <Surface
              id={PROFILE_ID}
              data={profile}
              onChange={(data) => {
                if (isProfile(data)) setProfile(data);
              }}
              onSubmit={({ data }) => {
                if (isProfile(data)) setProfile(data);
              }}
            />
            <Surface id={PROFILE_ID} data={profile} mode="display" />
          </div>
        </ComponentPreview>

        <section className="flex flex-col gap-4">
          <SectionHeading id="installation">Installation</SectionHeading>
          <CommandBlock args={INSTALL_ARGS} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="usage">Usage</SectionHeading>
          <CodeBlock title="app/page.tsx" code={usageCode} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading id="views">Views</SectionHeading>
          <p className="text-muted-foreground">
            Register a renderer for a schema, mode, and view in{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              components/surface/index.tsx
            </code>
            .
          </p>
          <ComponentPreview files={cardFiles}>
            <div className="flex justify-center">
              <Surface
                id={PROFILE_ID}
                data={profile}
                mode="display"
                view="card"
              />
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
