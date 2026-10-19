import { useState } from "react";
import { InMemorySchemaFetchResolver, createSurfaceUi } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "./profile-card";
import { ProfileIdentity, ProfileRow, ProfileByline, ProfileEdit, ProfilePhoto } from "./profile-components";
import sample from "./profile.sample.json";
import schema from "./profile.schema.json";

// These names belong to this app. Register any names your UI needs.
const registrations = [
  { key: schema.$id, mode: "display", view: "identity", component: ProfileIdentity },
  { key: schema.$id, mode: "display", view: "row", component: ProfileRow },
  { key: schema.$id, mode: "display", view: "card", component: ProfileCard },
  { key: schema.$id, mode: "display", view: "byline", component: ProfileByline },
  { key: schema.$id, mode: "input", view: "edit", component: ProfileEdit },
] as const;

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ ...shadcnSchemas, [schema.$id]: schema }),
  validator: createAjvValidator(),
  kit: createShadcnKit({ resolvers: [
    ...registrations,
    { key: `${schema.$id}#/$defs/photo`, mode: "display", view: "avatar", component: ProfilePhoto },
  ] }),
});

export function CardViews() {
  const [selected, setSelected] = useState<(typeof registrations)[number]>(registrations[2]);
  const [profile, setProfile] = useState<unknown>(sample);
  const { mode, view } = selected;
  return <div className="grid gap-6">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Registered profile views">
      {registrations.map(registration => <Button key={registration.view} size="sm"
        variant={view === registration.view ? "secondary" : "ghost"}
        aria-pressed={view === registration.view} onClick={() => setSelected(registration)}>
        {registration.mode} / {registration.view}
      </Button>)}
    </div>
    <code className="overflow-x-auto text-xs text-muted-foreground">
      {`<Surface id={profileType} mode="${mode}" view="${view}" data={profile} />`}
    </code>
    <Surface id={schema.$id} data={profile} mode={mode} view={view} onChange={setProfile} />
    <p className="text-sm text-muted-foreground">Try input / edit, then switch views. They all share the same data.</p>
  </div>;
}

export function ReferenceViews() {
  return <div className="grid items-center gap-6 sm:grid-cols-2">
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">The photo type, on its own</p>
      <Surface id={`${schema.$id}#/$defs/photo`} data={sample.photo} mode="display" view="avatar" />
    </div>
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">The same type, referenced inside a profile</p>
      <Surface id={schema.$id} data={sample} mode="display" view="identity" />
    </div>
  </div>;
}

export function ContextViews() {
  return <div className="grid items-start gap-6 md:grid-cols-2">
    <div className="grid gap-4 rounded-xl border p-4">
      <p className="text-sm font-medium">In your app · Team</p>
      <Surface id={schema.$id} data={sample} mode="display" view="identity" />
    </div>
    <div className="grid gap-4 rounded-xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">In agent chat</p>
      <p className="text-sm text-muted-foreground">Who can help with design?</p>
      <Surface id={schema.$id} data={sample} mode="display" view="identity" />
    </div>
  </div>;
}
