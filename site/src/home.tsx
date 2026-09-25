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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileCard } from "./profile-card";
import {
  PROFILE_ID,
  initialProfile,
  profileAnnotation,
  profileSchema,
} from "./profile";

const installCommand =
  "npx shadcn@latest add rusl-labs/surface-shadcn/surface";

const usage = `import { Surface } from "@/components/surface"

<Surface
  id={schemaId}
  data={profile}
  onChange={setProfile}
/>`;

const registration = `createShadcnKit({
  resolvers: [{
    key: "object",
    mode: "display",
    view: "card",
    component: ProfileCard,
  }],
})`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 font-mono text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Homepage() {
  const [profile, setProfile] = useState(initialProfile);
  const { Surface } = useMemo(() => {
    return createSurfaceUi({
      schemaResolver: new InMemorySchemaFetchResolver({
        [PROFILE_ID]: profileSchema,
      }),
      annotationResolver: new InMemoryAnnotationResolver({
        [PROFILE_ID]: profileAnnotation,
      }),
      validator: createAjvValidator(),
      kit: createShadcnKit({
        resolvers: [
          {
            key: "object",
            mode: "display",
            view: "card",
            component: ProfileCard,
          },
        ],
      }),
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
          <a href="/" className="text-sm font-medium">
            surface-shadcn
          </a>
          <Badge variant="secondary">shadcn</Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          surface-shadcn
        </h1>

        <div className="grid items-start gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
            </CardHeader>
            <CardContent>
              <Surface id={PROFILE_ID} data={profile} mode="display" />
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Installation</h2>
          <Code>{installCommand}</Code>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Usage</h2>
          <Code>{usage}</Code>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Card</h2>
          <div className="flex justify-center rounded-xl border bg-muted/40 p-10">
            <Surface id={PROFILE_ID} data={profile} mode="display" view="card" />
          </div>
          <Code>{registration}</Code>
        </section>
      </main>
    </div>
  );
}

function isProfile(data: unknown): data is typeof initialProfile {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.email === "string";
}

export function App() {
  return (
    <SurfaceProvider locale="en-US" defaultCountry="US" defaultCurrency="USD">
      <Homepage />
    </SurfaceProvider>
  );
}
