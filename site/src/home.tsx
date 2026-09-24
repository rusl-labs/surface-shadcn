import { useMemo, useState } from "react";
import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { SurfaceProvider } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "../../registry/surface/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BallotChoice } from "./ballot";
import { VOTE_ID, initialVote, voteAnnotation, voteSchema } from "./vote";

const installCommand =
  "npx shadcn@latest add rusl-labs/surface-shadcn/surface";

const usage = `import { Surface } from "@/components/surface";

<Surface
  id={schemaId}
  data={vote}
  onChange={setVote}
  onSubmit={({ data }) => save(data)}
/>`;

const registration = `createShadcnKit({
  resolvers: [{
    key: "enum",
    mode: "display",
    view: "ballot",
    component: BallotChoice,
  }],
});`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-foreground px-4 py-4 text-sm leading-relaxed text-background">
      <code>{children}</code>
    </pre>
  );
}

function Homepage() {
  const [vote, setVote] = useState(initialVote);
  const [displayView, setDisplayView] = useState<"default" | "ballot">(
    "ballot",
  );
  const { Surface } = useMemo(() => {
    return createSurfaceUi({
      schemaResolver: new InMemorySchemaFetchResolver({
        [VOTE_ID]: voteSchema,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [VOTE_ID]: voteAnnotation,
      }),
      validator: createAjvValidator(),
      kit: createShadcnKit({
        resolvers: [
          {
            key: "enum",
            mode: "display",
            view: "ballot",
            component: BallotChoice,
          },
        ],
      }),
    });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <a href="#top" className="font-heading text-sm font-semibold">
            surface
            <span className="font-normal text-muted-foreground"> / shadcn</span>
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#show">Show</a>
            <a href="#install">Install</a>
            <a href="#views">Your view</a>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto flex max-w-6xl flex-col gap-24 px-6 py-16">
        <section id="show" className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col gap-6 lg:pt-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Surface for shadcn
            </p>
            <h1 className="max-w-xl text-5xl leading-[1.05] font-semibold tracking-tight">
              Your schema, rendered with your components.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              One block install. One import. A JSON Schema becomes an editable
              form and a readable view, built from the Input, Field, and Select
              already in your app.
            </p>
            <p className="text-sm text-muted-foreground">
              This page imports{" "}
              <span className="text-foreground">@rusl-labs/surface@0.1.1</span>{" "}
              and{" "}
              <span className="text-foreground">@rusl-labs/surface-ajv@0.1.0</span>{" "}
              from npm. The renderers are the kit source in this repo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<a href="#install" />}
                size="lg"
              >
                Install
              </Button>
              <Button
                nativeButton={false}
                render={<a href="#views" />}
                variant="outline"
                size="lg"
              >
                Register a view
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>A vote, from a schema</CardTitle>
              <CardDescription>
                Choice and note. Save keeps the record on this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Surface
                id={VOTE_ID}
                data={vote}
                onChange={(data) => {
                  if (isVote(data)) setVote(data);
                }}
                onSubmit={({ data }) => {
                  if (isVote(data)) setVote(data);
                }}
              />
            </CardContent>
          </Card>
        </section>

        <section id="install" className="flex flex-col gap-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2>Install it into your application</h2>
            <p className="text-muted-foreground">
              The shadcn CLI copies the renderers into your project and installs
              the npm packages they import. Your theme and your local primitives
              stay yours.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">From this repository</p>
              <Code>{installCommand}</Code>
              <p className="text-sm text-muted-foreground">
                Works against the public GitHub repo today. The hosted registry
                file will be{" "}
                <span className="text-foreground">
                  https://ui.rusl.com/r/surface.json
                </span>{" "}
                once that static site is up.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Then render a schema</p>
              <Code>{usage}</Code>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">@rusl-labs/surface-shadcn</span>{" "}
                is the headless helper package. It is not on npm yet, so a
                public install still needs that publish.
              </p>
            </div>
          </div>
        </section>

        <section id="views" className="grid items-start gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2>Register your own view</h2>
            <p className="text-muted-foreground">
              Pass extra resolvers to <code>createShadcnKit</code>. They are
              appended last, so this one wins for an enum in display mode when
              the view is <code>ballot</code>. Every other field keeps the
              default renderer.
            </p>
            <Code>{registration}</Code>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Same vote, two presentations</CardTitle>
                <Badge variant="secondary">{displayView}</Badge>
              </div>
              <CardDescription>
                Edit the form above. This display follows it.
              </CardDescription>
              <div className="flex gap-2 pt-2">
                <Button
                  variant={displayView === "default" ? "default" : "outline"}
                  onClick={() => setDisplayView("default")}
                >
                  Default
                </Button>
                <Button
                  variant={displayView === "ballot" ? "default" : "outline"}
                  onClick={() => setDisplayView("ballot")}
                >
                  Ballot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Surface
                id={VOTE_ID}
                data={vote}
                mode="display"
                view={displayView}
              />
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t">
        <p className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          React 19 · Tailwind 4 · shadcn Base UI. The playground in{" "}
          <code>example/</code> is the full schema workspace.
        </p>
      </footer>
    </div>
  );
}

function isVote(data: unknown): data is typeof initialVote {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.choice === "string";
}

export function App() {
  return (
    <SurfaceProvider locale="en-US" defaultCountry="US" defaultCurrency="USD">
      <Homepage />
    </SurfaceProvider>
  );
}
