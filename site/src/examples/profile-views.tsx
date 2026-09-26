import { useState } from "react";
import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  createSurfaceUi,
  listFields,
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

// A view is listed under a mode when the annotation shows at least one field in that mode.
const menu = modes.map((mode) => ({
  mode,
  views: Object.keys(annotation.views).filter(
    (view) =>
      listFields({
        schema,
        annotation,
        coordinate: { subject: schema.$id, path: [] },
        mode,
        view,
      }).length > 0,
  ),
}));

export function ProfileViews() {
  const [mode, setMode] = useState(menu[0].mode);
  const [view, setView] = useState(menu[0].views[0]);
  const [profile, setProfile] = useState<unknown>(sample);

  return (
    <div className="grid gap-8 md:grid-cols-[9rem_minmax(0,1fr)]">
      <nav aria-label="Views" className="flex flex-col gap-5">
        {menu.map((group) => (
          <div key={group.mode} className="flex flex-col gap-1.5">
            <p className="px-2.5 text-xs font-medium text-muted-foreground capitalize">
              {group.mode}
            </p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {group.views.map((itemView) => {
                const active = group.mode === mode && itemView === view;
                return (
                  <Button
                    key={itemView}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start font-mono text-xs font-normal"
                    aria-pressed={active}
                    onClick={() => {
                      setMode(group.mode);
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
