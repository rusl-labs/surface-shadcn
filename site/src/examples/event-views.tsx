import { useState } from "react";
import { InMemoryAnnotationResolver, InMemorySchemaFetchResolver, createSurfaceUi, type SurfaceMode } from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import { createShadcnKit } from "@/components/surface/kit";
import { Button } from "@/components/ui/button";
import schema from "./event.schema.json";
import annotation from "./event.annotation.json";

const { Surface } = createSurfaceUi({
  schemaResolver: new InMemorySchemaFetchResolver({ ...shadcnSchemas, [schema.$id]: schema }),
  annotationResolver: new InMemoryAnnotationResolver({ [annotation.subject]: annotation }),
  validator: createAjvValidator(),
  kit: createShadcnKit(), // No custom event component registered.
});
export const eventSample = {
  title: "Designing with Surface",
  date: "2026-11-12",
  location: "Studio 4 · San Francisco",
  phone: "+14155550100",
  description: "A hands-on evening building reusable views.",
  registrationOpen: true,
};

const menu = [
  { mode: "display", views: ["identity", "row", "card", "byline"] },
  { mode: "input", views: ["full", "edit", "registration"] },
] as const;

export function EventViews() {
  const [mode, setMode] = useState<SurfaceMode>("display");
  const [view, setView] = useState<string>("card");
  const [data, setData] = useState<unknown>(eventSample);

  return (
    <div className="grid items-start gap-8 md:grid-cols-[9rem_minmax(0,1fr)]">
      <nav aria-label="Dynamic event views" className="flex flex-col gap-5">
        {menu.map(group => (
          <div key={group.mode} className="flex flex-col gap-1.5">
            <p className="px-2.5 text-xs font-medium text-muted-foreground">{group.mode}</p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {group.views.map(name => (
                <Button key={name} size="sm" className="justify-start font-mono text-xs font-normal"
                  variant={mode === group.mode && view === name ? "secondary" : "ghost"}
                  aria-pressed={mode === group.mode && view === name}
                  onClick={() => { setMode(group.mode); setView(name); }}>
                  {name}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="grid min-w-0 gap-4">
        <code className="text-xs text-muted-foreground">{`mode="${mode}" view="${view}"`}</code>
        <Surface id={schema.$id} data={data} mode={mode} view={view} onChange={setData} />
      </div>
    </div>
  );
}
