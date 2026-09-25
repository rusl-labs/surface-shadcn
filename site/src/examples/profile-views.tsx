import { useState } from "react";
import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
  type SurfaceMode,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import { Button } from "@/components/ui/button";
import annotation from "./profile.annotation.json";
import sample from "./profile.sample.json";
import schema from "./profile.schema.json";

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({
    ...shadcnSchemas,
    [schema.$id]: schema,
  }),
  annotationResolver: new InMemoryAnnotationResolver({
    [annotation.subject]: annotation,
  }),
  validator: createAjvValidator(),
  kit: createShadcnKit(),
});

const modes: readonly SurfaceMode[] = ["input", "display"];
const views = Object.keys(annotation.views);

export function ProfileViews() {
  const [mode, setMode] = useState<SurfaceMode>("input");
  const [view, setView] = useState(views[0]);
  const [profile, setProfile] = useState<unknown>(sample);

  return (
    <div className="grid gap-8 md:grid-cols-[9rem_minmax(0,1fr)]">
      <nav aria-label="Views" className="flex flex-col gap-5">
        {modes.map((itemMode) => (
          <div key={itemMode} className="flex flex-col gap-1.5">
            <p className="px-2.5 text-xs font-medium text-muted-foreground capitalize">
              {itemMode}
            </p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {views.map((itemView) => {
                const active = itemMode === mode && itemView === view;
                return (
                  <Button
                    key={itemView}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start font-mono text-xs font-normal"
                    aria-pressed={active}
                    onClick={() => {
                      setMode(itemMode);
                      setView(itemView);
                    }}
                  >
                    {itemView}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="min-w-0">
        <Surface
          id={schema.$id}
          data={profile}
          mode={mode}
          view={view}
          onChange={setProfile}
          onSubmit={({ data }) => setProfile(data)}
        />
      </div>
    </div>
  );
}
